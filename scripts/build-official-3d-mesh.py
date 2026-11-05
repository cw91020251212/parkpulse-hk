"""Normalize the legally reusable LandsD pilot model for the existing MapLibre view.
No Google data, guessed storey heights, API key or runtime government API request.
Input b3dm is the bounded official public example download retained with attribution.
"""
import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/official-3d/nts-police.b3dm'
OUTPUT = ROOT / 'public/data/official-3d/nts-police-mesh.json'
ORIGIN = {'lng': 114.1228103, 'lat': 22.3710608}
ROOT_TRANSLATION = (-2413000.0, 5380000.0, 2420000.0)


def ecef_to_geodetic(x, y, z):
    radius = 6378137.0
    eccentricity = 6.69437999014e-3
    lng = math.atan2(y, x)
    horizontal = math.hypot(x, y)
    lat = math.atan2(z, horizontal * (1 - eccentricity))
    for _ in range(10):
        normal = radius / math.sqrt(1 - eccentricity * math.sin(lat) ** 2)
        height = horizontal / math.cos(lat) - normal
        lat = math.atan2(z, horizontal * (1 - eccentricity * normal / (normal + height)))
    return math.degrees(lng), math.degrees(lat), height


def mercator(lng, lat):
    radians = math.radians(lat)
    return ((lng + 180) / 360, (1 - math.log(math.tan(math.pi / 4 + radians / 2)) / math.pi) / 2)


raw = SOURCE.read_bytes()
magic, version, length, feature_json, feature_bin, batch_json, batch_bin = struct.unpack_from('<4s6I', raw)
assert magic == b'b3dm' and version == 1 and length == len(raw)
start = 28 + feature_json + feature_bin + batch_json + batch_bin
glb = raw[start:]
assert glb[:4] == b'glTF'
json_length, json_type = struct.unpack_from('<2I', glb, 12)
assert json_type == 0x4E4F534A
model = json.loads(glb[20:20 + json_length])
binary_start = 20 + json_length + 8


def accessor(index):
    value = model['accessors'][index]
    view = model['bufferViews'][value['bufferView']]
    components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[value['type']]
    code, width = {5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}[value['componentType']]
    stride = view.get('byteStride') or components * width
    offset = binary_start + view.get('byteOffset', 0) + value.get('byteOffset', 0)
    return [struct.unpack_from('<' + code * components, glb, offset + i * stride) for i in range(value['count'])]


# The source has one uncompressed mesh and no additional node transform. Do not
# silently process differently transformed/compressed models as if they were identical.
assert len(model['meshes']) == 1
assert all(not any(k in n for k in ('matrix', 'translation', 'rotation', 'scale')) for n in model['nodes'])
primitive = model['meshes'][0]['primitives'][0]
assert primitive.get('mode', 4) == 4
raw_positions = accessor(primitive['attributes']['POSITION'])
raw_indices = [v[0] for v in accessor(primitive['indices'])]
# glTF Y-up -> 3D Tiles Z-up; then source root translation -> ECEF.
geo = [ecef_to_geodetic(x + ROOT_TRANSLATION[0], -z + ROOT_TRANSLATION[1], y + ROOT_TRANSLATION[2]) for x, y, z in raw_positions]
minimum_altitude = min(p[2] for p in geo)
maximum_altitude = max(p[2] for p in geo)
mx, my = mercator(ORIGIN['lng'], ORIGIN['lat'])
metre_scale = 1 / (40075016.68557849 * math.cos(math.radians(ORIGIN['lat'])))
positions = []
for lng, lat, altitude in geo:
    x, y = mercator(lng, lat)
    positions.extend(((x-mx)/metre_scale, (y-my)/metre_scale, altitude-minimum_altitude))
# East/South/Up reverses handedness, so reverse triangle winding.
indices = []
for i in range(0, len(raw_indices), 3):
    a, b, c = raw_indices[i:i+3]
    indices.extend((a, c, b))
normals = [0.0] * len(positions)
for i in range(0, len(indices), 3):
    a, b, c = [v*3 for v in indices[i:i+3]]
    u = [positions[b+k]-positions[a+k] for k in range(3)]
    v = [positions[c+k]-positions[a+k] for k in range(3)]
    n = (u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0])
    for base in (a, b, c):
        for k in range(3):
            normals[base+k] += n[k]
for i in range(0, len(normals), 3):
    length = math.sqrt(sum(normals[i+k]**2 for k in range(3)))
    normals[i:i+3] = [normals[i+k]/length if length else (1.0 if k == 2 else 0.0) for k in range(3)]
result = {
    'version': 1, 'origin': ORIGIN,
    'positions': [round(v, 5) for v in positions],
    'normals': [round(v, 6) for v in normals],
    'indices': indices,
    'bounds': {'west': min(p[0] for p in geo), 'east': max(p[0] for p in geo), 'south': min(p[1] for p in geo), 'north': max(p[1] for p in geo)},
    'source': {
        'provider': 'Lands Department, HKSAR Government',
        'dataset': '3D Spatial Data',
        'modelId': 'B307012577101062E0',
        'documentation': 'https://portal.csdi.gov.hk/csdi-webpage/apidoc/3d-spatial-data-api',
        'terms': 'https://portal.csdi.gov.hk/csdi-webpage/apidoc/3d-spatial-data-api',
        'downloadedAt': '2026-11-06',
        'sourceUpdateDate': None,
        'sourceMinimumEllipsoidAltitudeMetres': round(minimum_altitude, 5),
        'sourceMaximumEllipsoidAltitudeMetres': round(maximum_altitude, 5),
        'modelVerticalSpanMetres': round(maximum_altitude-minimum_altitude, 5),
        'normalization': 'One uniform vertical translation places the lowest model vertex at map ground. Original geometry, roof profile and relative vertical differences are retained. Span includes rooftop structures and is not advertised as measured occupied-tower height.',
    },
}
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f'Wrote {OUTPUT}: {len(positions)//3} vertices, {len(indices)//3} triangles, vertical geometry span {maximum_altitude-minimum_altitude:.3f}m')
