import type { Cesium3DTileset, Viewer } from 'cesium';
import { sceneQuality, type SceneLoadState } from '../domain/scene3d.ts';

export type { SceneLoadState } from '../domain/scene3d.ts';
export const CESIUM_VERSION = '1.147.0';
/** Official published 3D Tiles endpoint; no website-internal credentials. */
export const LANDSD_PHOTOREAL_URL = 'https://data.map.gov.hk/api/3d-data/3dtiles/f2/tileset.json';
export const LANDSD_3D_ATTRIBUTION = '© HKSAR Government, Lands Department';
export type LandsD3DConfig = { kind: '3dtiles'; urls: string[]; apiKey?: string; attribution: string };
type SDK = typeof import('cesium');
type SDKWindow = Window & { Cesium?: SDK; CESIUM_BASE_URL?: string };
let sdkPromise: Promise<SDK> | undefined;

/** Optional owner-supplied configuration; public official data is the default. */
export function getLandsD3DConfig(env: Record<string, string | undefined> = import.meta.env ?? {}): LandsD3DConfig | null {
  const urls = (env.VITE_LANDSD_3D_URL || LANDSD_PHOTOREAL_URL).split(';').map(url => url.trim()).filter(Boolean);
  if (!urls.length || urls.some(value => { try { const url = new URL(value); return url.protocol !== 'https:' || !!url.username || !!url.password; } catch { return true; } })) return null;
  return { kind: '3dtiles', urls, apiKey: env.VITE_LANDSD_3D_API_KEY || undefined, attribution: LANDSD_3D_ATTRIBUTION };
}

/** Standalone, versioned workers avoid bundler worker/base-path incompatibility. */
export function loadCesium(): Promise<SDK> {
  const global = window as SDKWindow;
  if (global.Cesium) return Promise.resolve(global.Cesium);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<SDK>((resolve, reject) => {
    const base = new URL(`${import.meta.env?.BASE_URL ?? '/'}vendor/cesium/${CESIUM_VERSION}/`, location.href).href;
    global.CESIUM_BASE_URL = base;
    if (!document.querySelector('link[data-parkpulse-cesium]')) {
      const style = document.createElement('link');
      style.rel = 'stylesheet'; style.href = `${base}Widgets/widgets.css`; style.dataset.parkpulseCesium = 'true';
      document.head.append(style);
    }
    const script = document.createElement('script');
    script.src = `${base}Cesium.js`; script.async = true;
    const timeout = window.setTimeout(() => fail(new Error('3D SDK loading timed out')), 30_000);
    const fail = (error: Error) => { window.clearTimeout(timeout); script.remove(); reject(error); };
    script.onload = () => { window.clearTimeout(timeout); global.Cesium ? resolve(global.Cesium) : fail(new Error('3D SDK did not initialize')); };
    script.onerror = () => fail(new Error('3D SDK could not be loaded'));
    document.head.append(script);
  }).catch(error => { sdkPromise = undefined; throw error; });
  return sdkPromise;
}

/** Current-view meshes refine automatically, including already-cached detail. */
export async function attachLandsDScene(C: SDK, viewer: Viewer, config: LandsD3DConfig,
  onState: (state: SceneLoadState) => void, signal: AbortSignal): Promise<() => void> {
  const hardware = navigator as Navigator & { deviceMemory?: number };
  const quality = sceneQuality(hardware.deviceMemory, hardware.hardwareConcurrency);
  const models: Cesium3DTileset[] = [];
  const cleanup: Array<() => void> = [];
  const timers = new Set<number>();
  // 0=no mesh, 1=quick preview, 2=intermediate, 3=fine, 4=settled.
  const state = new Map<Cesium3DTileset, { stage: number; pending: number; appliedFrame: number }>();
  let active = true;
  let renderedFrames = 0;
  let firstVisible = false;
  let lastLoadRender = 0;
  let watchdog: number | undefined;
  let reported = '';
  const alive = () => active && !signal.aborted && !viewer.isDestroyed();
  const emit = (value: SceneLoadState) => {
    if (!alive()) return;
    const key = `${value.phase}:${value.pending}`;
    if (key === reported) return;
    reported = key;
    onState(value);
  };
  const report = () => {
    const values = [...state.values()];
    const pending = values.reduce((sum, value) => sum + value.pending, 0);
    const phase = values.length === 0 ? 'loading' : values.every(value => value.stage === 4 && value.pending === 0) ? 'ready'
      : values.some(value => value.stage >= 2) || (firstVisible && pending > 0) ? 'refining' : firstVisible ? 'preview' : 'loading';
    emit({ phase, pending });
  };
  const dispose = () => {
    if (!active) return;
    active = false;
    signal.removeEventListener('abort', dispose);
    for (const timer of timers) window.clearTimeout(timer);
    timers.clear();
    cleanup.forEach(remove => remove());
    for (const model of models) {
      if (model.isDestroyed()) continue;
      if (!viewer.isDestroyed() && viewer.scene.primitives.contains(model)) viewer.scene.primitives.remove(model);
      else model.destroy();
    }
  };
  if (signal.aborted) return dispose;
  signal.addEventListener('abort', dispose, { once: true });
  emit({ phase: 'loading', pending: 0 });
  // Metadata may succeed while indispensable child meshes/decoders fail.
  watchdog = window.setTimeout(() => {
    if (!alive() || firstVisible) return;
    // Isolated detail failures after a usable preview never trigger this fallback.
    emit({ phase: 'error', pending: 0 });
    dispose();
  }, 45_000);
  timers.add(watchdog);
  // Deferred/throttled requests need real frame numbers, not only idle checks.
  // A rate-limited warmup stops as soon as the visible scene has settled.
  cleanup.push(viewer.scene.postUpdate.addEventListener(() => {
    if (!alive() || ![...state].some(([model, current]) => !model.tilesLoaded || current.stage === 2 || current.stage === 3)) return;
    const now = performance.now();
    if (now - lastLoadRender < 100) return;
    lastLoadRender = now;
    viewer.scene.requestRender();
  }));
  // allTilesLoaded is not guaranteed to fire when the next quality uses cached tiles.
  cleanup.push(viewer.scene.postRender.addEventListener(() => {
    if (!alive()) return;
    renderedFrames++;
    for (const [model, current] of state) {
      if (current.stage < 2 || current.stage === 4 || !model.tilesLoaded || renderedFrames <= current.appliedFrame) continue;
      if (current.stage === 2) {
        current.stage = 3;
        current.appliedFrame = renderedFrames;
        model.maximumScreenSpaceError = quality.finalError;
        viewer.scene.requestRender();
      } else if (current.stage === 3) current.stage = 4;
    }
    report();
  }));
  try {
    await Promise.all(config.urls.map(async url => {
      // Resource derivation preserves this owner's optional query key for child tiles.
      const resource = new C.Resource({ url, queryParameters: config.apiKey ? { key: config.apiKey } : undefined });
      const model = await C.Cesium3DTileset.fromUrl(resource, {
        maximumScreenSpaceError: quality.previewError,
        cacheBytes: quality.cacheBytes, maximumCacheOverflowBytes: quality.cacheBytes,
        progressiveResolutionHeightFraction: 0.3, preloadFlightDestinations: true,
        cullRequestsWhileMoving: true, dynamicScreenSpaceError: true,
      });
      if (!alive()) { model.destroy(); return; }
      models.push(model);
      const current = { stage: 0, pending: 0, appliedFrame: renderedFrames };
      state.set(model, current);
      cleanup.push(model.tileVisible.addEventListener(tile => {
        if (!alive() || current.stage !== 0) return;
        const content = tile.content;
        if (!content || !(content.geometryByteLength > 0 || content.trianglesLength > 0 || content.pointsLength > 0)) return;
        firstVisible = true;
        if (watchdog !== undefined) { window.clearTimeout(watchdog); timers.delete(watchdog); watchdog = undefined; }
        current.stage = 1;
        report();
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          if (!alive()) return;
          current.stage = 2;
          current.appliedFrame = renderedFrames;
          model.maximumScreenSpaceError = quality.intermediateError;
          viewer.scene.requestRender();
          report();
        }, 500);
        timers.add(timer);
        // Do not gate the centre's finest detail on distant intermediate tiles.
        const fineTimer = window.setTimeout(() => {
          timers.delete(fineTimer);
          if (!alive() || current.stage >= 3) return;
          current.stage = 3;
          current.appliedFrame = renderedFrames;
          model.maximumScreenSpaceError = quality.finalError;
          viewer.scene.requestRender();
          report();
        }, 1_250);
        timers.add(fineTimer);
      }));
      cleanup.push(model.tileFailed.addEventListener(() => {
        if (alive() && !firstVisible) viewer.scene.requestRender();
      }));
      cleanup.push(model.loadProgress.addEventListener((requests: number, processing: number) => {
        current.pending = requests + processing;
        report();
      }));
      viewer.scene.primitives.add(model);
      viewer.scene.requestRender();
    }));
    report();
    return dispose;
  } catch (error) {
    emit({ phase: 'error', pending: 0 });
    dispose();
    throw error;
  }
}
