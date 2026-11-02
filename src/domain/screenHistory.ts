export type ScreenName = 'map' | 'results' | 'atm-banks' | 'detail' | 'settings' | 'help' | 'disclaimer' | 'district' | 'legend' | 'popup';
export interface HistoryPort {
  readonly state: unknown;
  pushState(state: unknown, unused: string): void;
  replaceState(state: unknown, unused: string): void;
  go(delta: number): void;
}
type Entry = { name: ScreenName; id: number; dismiss: () => void; trigger?: HTMLElement; retired?: boolean };
type Stamp = { session: string; ids: number[] };
const KEY = 'parkpulseScreens';
const objectState = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? { ...value } : {};

/** One same-URL entry per open screen, including Leaflet popups. Never traps Back at the root. */
export class ScreenHistory {
  private entries: Entry[] = [];
  private nextId = 0;
  private pending = false;
  private listeners = new Set<() => void>();
  private revision = 0;
  private history: HistoryPort;
  private session: string;
  constructor(history: HistoryPort, session: string) { this.history = history; this.session = session; }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.revision;
  private notify() { this.revision++; this.listeners.forEach((listener) => listener()); }
  has = (name: ScreenName) => this.entries.some((entry) => entry.name === name);
  isTop = (name: ScreenName) => this.entries.at(-1)?.name === name;
  get locked() { return this.entries.some((entry) => entry.name !== 'popup'); }
  get depth() { return this.entries.length; }
  get topName() { return this.entries.at(-1)?.name; }
  private state() { return { ...objectState(this.history.state), [KEY]: { session: this.session, ids: this.entries.map((entry) => entry.id) } }; }
  open(name: ScreenName, dismiss: () => void): boolean {
    if (this.pending) return false;
    const existing = this.entries.find((entry) => entry.name === name);
    if (existing) { existing.dismiss = dismiss; existing.retired = false; return true; }
    const trigger = typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    this.entries.push({ name, id: ++this.nextId, dismiss, trigger });
    this.history.pushState(this.state(), '');
    this.notify();
    return true;
  }
  /** State is dismissed on popstate, not prematurely, so fast double taps cannot consume extra history. */
  close(name?: ScreenName): void {
    if (this.pending || this.entries.length === 0) return;
    const index = name ? this.entries.findIndex((entry) => entry.name === name) : this.entries.length - 1;
    if (index < 0) return;
    this.pending = true;
    this.history.go(index - this.entries.length);
  }
  /** A data update can remove an underlying popup/detail. Do not close a newer child screen. */
  retire(name: ScreenName): void {
    const entry = this.entries.find((item) => item.name === name);
    if (!entry) return;
    entry.retired = true;
    if (this.isTop(name)) this.close(name);
  }
  /** Replace the picker with the map without leaving a dead picker entry behind. */
  replace(name: ScreenName, next: ScreenName, dismiss: () => void): boolean {
    if (this.pending || !this.isTop(name)) return false;
    const previous = this.entries.pop()!;
    previous.dismiss();
    this.entries.push({ name: next, id: ++this.nextId, dismiss, trigger: previous.trigger });
    this.history.replaceState(this.state(), '');
    this.notify();
    return true;
  }
  handlePop(state: unknown): void {
    const stamp = objectState(state)[KEY] as Stamp | undefined;
    const ids = stamp?.session === this.session && Array.isArray(stamp.ids) ? stamp.ids : [];
    let retained = 0;
    while (retained < this.entries.length && this.entries[retained].id === ids[retained]) retained++;
    const removed = this.entries.splice(retained);
    this.pending = false;
    for (const entry of [...removed].reverse()) entry.dismiss();
    // Forward never resurrects stale DOM/history layers that no longer have live state.
    this.history.replaceState(this.state(), '');
    this.notify();
    const trigger = removed[0]?.trigger;
    if (trigger && typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => {
      if (trigger.isConnected && trigger.getClientRects().length) trigger.focus({ preventScroll: true });
    });
    if (this.entries.at(-1)?.retired) this.close();
  }
}
