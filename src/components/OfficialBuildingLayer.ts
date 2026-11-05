import { MercatorCoordinate, type CustomLayerInterface } from 'maplibre-gl';

/** Decoded official mesh; coordinates and normals use local east/south/up axes. */
export type OfficialBuildingMesh = {
  version: 1;
  origin: { lng: number; lat: number };
  positions: number[];
  normals: number[];
  indices: number[];
  bounds: { west: number; east: number; south: number; north: number };
  source: Record<string, unknown>;
};

// Prevent an unexpectedly large/malformed download from allocating unbounded GPU memory.
const MAX_VERTICES = 2_000_000;
const MAX_INDICES = 12_000_000;
const MAX_LOCAL_METERS = 1_000_000;
const MAX_MERCATOR_LATITUDE = 85.0511287798066;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isLongitude = (value: unknown): value is number =>
  isFiniteNumber(value) && value >= -180 && value <= 180;
const isLatitude = (value: unknown): value is number =>
  isFiniteNumber(value) && Math.abs(value) <= MAX_MERCATOR_LATITUDE;

/** Validate the JSON contract before converting it into typed arrays or GPU buffers. */
export function isOfficialBuildingMesh(value: unknown): value is OfficialBuildingMesh {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.origin)
    || !isRecord(value.bounds) || !isRecord(value.source)) return false;
  if (!isLongitude(value.origin.lng) || !isLatitude(value.origin.lat)) return false;
  const { west, east, south, north } = value.bounds;
  if (!isLongitude(west) || !isLongitude(east) || !isLatitude(south)
    || !isLatitude(north) || west > east || south > north) return false;
  const { positions, normals, indices } = value;
  if (!Array.isArray(positions) || !Array.isArray(normals) || !Array.isArray(indices)
    || positions.length < 9 || positions.length > MAX_VERTICES * 3
    || positions.length % 3 !== 0 || normals.length !== positions.length
    || indices.length < 3 || indices.length > MAX_INDICES || indices.length % 3 !== 0) return false;
  for (let i = 0; i < positions.length; i += 3) {
    let normalLengthSquared = 0;
    for (let axis = 0; axis < 3; axis += 1) {
      const position = positions[i + axis];
      const normal = normals[i + axis];
      if (!isFiniteNumber(position) || Math.abs(position) > MAX_LOCAL_METERS
        || !isFiniteNumber(normal) || Math.abs(normal) > 1.01) return false;
      normalLengthSquared += normal * normal;
    }
    // Permit rounding in the decoded JSON, but reject zero/non-unit normals.
    if (Math.abs(normalLengthSquared - 1) > 0.05) return false;
  }
  const vertexCount = positions.length / 3;
  for (let i = 0; i < indices.length; i += 1) {
    const index = indices[i];
    if (!isFiniteNumber(index) || !Number.isInteger(index) || index < 0 || index >= vertexCount) return false;
  }
  return true;
}

const VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
uniform mat4 u_matrix;
out vec3 v_normal;
void main() {
  // Positive uniform scale preserves the east/south/up normal directions.
  v_normal = a_normal;
  gl_Position = u_matrix * vec4(a_position, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec3 v_normal;
out vec4 fragColor;
void main() {
  vec3 normal = normalize(v_normal);
  // Render both sides: decoded tiles need not share a consistent winding order.
  // Keep upward normals intact so roof classification does not flip with the camera.
  float roof = smoothstep(0.45, 0.85, normal.z);
  vec3 wallColor = vec3(0.45, 0.52, 0.59);
  vec3 roofColor = vec3(0.61, 0.67, 0.72);
  vec3 lightDirection = normalize(vec3(-0.45, -0.55, 0.80));
  float diffuse = max(dot(normal, lightDirection), 0.0);
  float illumination = 0.48 + 0.52 * diffuse;
  fragColor = vec4(mix(wallColor, roofColor, roof) * illumination, 1.0);
}`;

type GpuResources = {
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  positions: WebGLBuffer;
  normals: WebGLBuffer;
  indices: WebGLBuffer;
  matrixUniform: WebGLUniformLocation;
};

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Official building layer: shader allocation failed.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Official building layer: shader compilation failed: ${log ?? 'unknown error'}`);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  let fragment: WebGLShader | null = null;
  let program: WebGLProgram | null = null;
  try {
    fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    program = gl.createProgram();
    if (!program) throw new Error('Official building layer: program allocation failed.');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Official building layer: program linking failed: ${gl.getProgramInfoLog(program) ?? 'unknown error'}`);
    }
    return program;
  } catch (error) {
    if (program) gl.deleteProgram(program);
    throw error;
  } finally {
    // Linked programs retain their compiled shaders; no separate shader lifetime is needed.
    if (program) {
      gl.detachShader(program, vertex);
      if (fragment) gl.detachShader(program, fragment);
    }
    gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
  }
}

/** Column-major product: projection * (translation * positive uniform scale). */
function projectionWithModel(
  out: Float32Array,
  projection: ArrayLike<number>,
  origin: MercatorCoordinate,
  scale: number,
): void {
  for (let row = 0; row < 4; row += 1) {
    out[row] = projection[row] * scale;
    out[4 + row] = projection[4 + row] * scale;
    out[8 + row] = projection[8 + row] * scale;
    // Compute the translation in JS double precision before the final float upload.
    out[12 + row] = projection[row] * origin.x + projection[4 + row] * origin.y
      + projection[8 + row] * origin.z + projection[12 + row];
  }
}

function setEnabled(gl: WebGL2RenderingContext, capability: number, enabled: boolean): void {
  if (enabled) gl.enable(capability);
  else gl.disable(capability);
}

/**
 * Native opaque WebGL2 layer for the app's Mercator map. No camera, marker or mode changes.
 * Add with map.addLayer(); GPU cleanup is exclusively through map.removeLayer().
 * MapLibre drops custom layers on context loss/style rebuild: the owner must re-add the
 * layer after the restored style loads, which invokes onAdd with fresh GPU resources.
 */
export function createOfficialBuildingLayer(mesh: OfficialBuildingMesh): CustomLayerInterface {
  if (!isOfficialBuildingMesh(mesh)) throw new TypeError('Invalid official building mesh.');
  const origin = MercatorCoordinate.fromLngLat(mesh.origin, 0);
  const scale = origin.meterInMercatorCoordinateUnits();
  const positionData = new Float32Array(mesh.positions);
  const normalData = new Float32Array(mesh.normals);
  let maxIndex = 0;
  for (const index of mesh.indices) maxIndex = Math.max(maxIndex, index);
  // UNSIGNED_INT indices are native in WebGL2; no extension is required.
  const indexData = maxIndex > 65535 ? new Uint32Array(mesh.indices) : new Uint16Array(mesh.indices);
  const matrix = new Float32Array(16);
  let gpu: GpuResources | null = null;

  const destroy = (gl: WebGL2RenderingContext) => {
    if (!gpu) return;
    gl.deleteVertexArray(gpu.vao);
    gl.deleteBuffer(gpu.positions);
    gl.deleteBuffer(gpu.normals);
    gl.deleteBuffer(gpu.indices);
    gl.deleteProgram(gpu.program);
    gpu = null;
  };

  return {
    id: 'parkpulse-official-nts-model',
    type: 'custom',
    renderingMode: '3d',
    onAdd(_map, gl) {
      destroy(gl);
      const previousVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING) as WebGLVertexArrayObject | null;
      const previousArrayBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING) as WebGLBuffer | null;
      const program = createProgram(gl);
      const vao = gl.createVertexArray();
      const positions = gl.createBuffer();
      const normals = gl.createBuffer();
      const indices = gl.createBuffer();
      try {
        const matrixUniform = gl.getUniformLocation(program, 'u_matrix');
        if (!vao || !positions || !normals || !indices || matrixUniform === null) {
          throw new Error('Official building layer: GPU resource allocation failed.');
        }
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, positions);
        gl.bufferData(gl.ARRAY_BUFFER, positionData, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, normals);
        gl.bufferData(gl.ARRAY_BUFFER, normalData, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
        gpu = { program, vao, positions, normals, indices, matrixUniform };
      } catch (error) {
        if (vao) gl.deleteVertexArray(vao);
        if (positions) gl.deleteBuffer(positions);
        if (normals) gl.deleteBuffer(normals);
        if (indices) gl.deleteBuffer(indices);
        gl.deleteProgram(program);
        throw error;
      } finally {
        // The index binding belongs to its VAO; restoring that VAO restores its indices.
        gl.bindVertexArray(previousVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, previousArrayBuffer);
      }
    },
    render(gl, options) {
      if (!gpu || gl.isContextLost()) return;
      projectionWithModel(matrix, options.defaultProjectionData.mainMatrix, origin, scale);
      const previousProgram = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
      const previousVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING) as WebGLVertexArrayObject | null;
      const depthTest = gl.isEnabled(gl.DEPTH_TEST);
      const blend = gl.isEnabled(gl.BLEND);
      const cullFace = gl.isEnabled(gl.CULL_FACE);
      const stencilTest = gl.isEnabled(gl.STENCIL_TEST);
      const polygonOffset = gl.isEnabled(gl.POLYGON_OFFSET_FILL);
      const depthFunc = gl.getParameter(gl.DEPTH_FUNC) as number;
      const depthMask = gl.getParameter(gl.DEPTH_WRITEMASK) as boolean;
      const colorMask = gl.getParameter(gl.COLOR_WRITEMASK) as boolean[];
      try {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.STENCIL_TEST);
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.colorMask(true, true, true, true);
        // Keep MapLibre's framebuffer, viewport and 3D depth range; never clear them.
        gl.useProgram(gpu.program);
        gl.bindVertexArray(gpu.vao);
        gl.uniformMatrix4fv(gpu.matrixUniform, false, matrix);
        gl.drawElements(gl.TRIANGLES, indexData.length,
          indexData instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);
      } finally {
        gl.bindVertexArray(previousVao);
        gl.useProgram(previousProgram);
        gl.depthFunc(depthFunc);
        gl.depthMask(depthMask);
        gl.colorMask(colorMask[0], colorMask[1], colorMask[2], colorMask[3]);
        setEnabled(gl, gl.DEPTH_TEST, depthTest);
        setEnabled(gl, gl.BLEND, blend);
        setEnabled(gl, gl.CULL_FACE, cullFace);
        setEnabled(gl, gl.STENCIL_TEST, stencilTest);
        setEnabled(gl, gl.POLYGON_OFFSET_FILL, polygonOffset);
      }
    },
    onRemove(_map, gl) {
      destroy(gl);
    },
  };
}
