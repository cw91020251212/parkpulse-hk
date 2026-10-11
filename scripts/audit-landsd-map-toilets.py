#!/usr/bin/env python3
"""Find exact toilet points labelled by the LandsD GeoInfo Map location search.

This is a conservative supplement, not a replacement for FEHD/LCSD/AFCD/HAD.
It accepts only non-vague official labels, then excludes exact co-located points
within 20 metres and same-named exact toilet points within 150 metres.
Run manually, review the output, then commit the generated Pages snapshot.
"""
from __future__ import annotations

import concurrent.futures
import hashlib
import json
import math
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/pages-data/landsd-map-toilets.json"
SEARCH_URL = "https://www.map.gov.hk/gs/api/v1.0.0/locationSearch"
TRANSFORM_URL = "https://www.geodetic.gov.hk/transform/v2/"
HEADERS = {
    "Accept": "application/json",
    "Referer": "https://www.map.gov.hk/",
    "User-Agent": "Mozilla/5.0 ParkPulse HK LandsD toilet audit",
}
DISTRICTS = [
    ("中西區", "Central and Western"), ("灣仔區", "Wan Chai"), ("東區", "Eastern"), ("南區", "Southern"),
    ("油尖旺區", "Yau Tsim Mong"), ("深水埗區", "Sham Shui Po"), ("九龍城區", "Kowloon City"), ("黃大仙區", "Wong Tai Sin"), ("觀塘區", "Kwun Tong"),
    ("葵青區", "Kwai Tsing"), ("荃灣區", "Tsuen Wan"), ("屯門區", "Tuen Mun"), ("元朗區", "Yuen Long"), ("北區", "North"), ("大埔區", "Tai Po"), ("沙田區", "Sha Tin"), ("西貢區", "Sai Kung"), ("離島區", "Islands"),
]
TOILET_LABEL = re.compile(r"廁所|洗手間|公廁|toilet|washroom|restroom|latrine|lavatory", re.I)
VAGUE_LABEL = re.compile(r"附近|旁邊|旁|對面|近|側|near|nearby|adjacent|beside|next\s+to|opposite|outside", re.I)
HONG_KONG_BOUNDS = (21.5, 23.0, 113.7, 114.6)
EXISTING_EXACT_POINT_METRES = 20
EXISTING_SAME_TOILET_METRES = 150
MAX_WORKERS = 4
MAX_ATTEMPTS = 5


def normalize(value: Any) -> str:
    return "".join(character for character in unicodedata.normalize("NFKC", str(value or "")).lower() if character.isalnum())


def comparable_toilet_name(value: Any) -> str:
    label = unicodedata.normalize("NFKC", str(value or "")).lower()
    label = re.sub(r"(?:public\s*)?(?:toilets?|washrooms?|restrooms?|latrines?|公共廁所|公眾廁所|公廁|洗手間|廁所)", "", label)
    return "".join(character for character in label if character.isalnum())


def get_json(url: str) -> Any:
    last_error: Exception | None = None
    for attempt in range(MAX_ATTEMPTS):
        try:
            request = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(request, timeout=45) as response:
                return json.loads(response.read())
        except Exception as error:
            last_error = error
            if attempt + 1 < MAX_ATTEMPTS:
                time.sleep(0.5 * (attempt + 1))
    assert last_error is not None
    raise last_error


def search_url(query: str) -> str:
    return SEARCH_URL + "?" + urllib.parse.urlencode({"q": query, "n": 50, "lang": "tc"})


def search_district(district_zh: str, district_en: str) -> tuple[list[dict[str, Any]], list[str]]:
    found: list[dict[str, Any]] = []
    errors: list[str] = []
    for query in (f"{district_zh} 公廁", f"{district_zh} 廁所", f"{district_en} public toilet"):
        url = search_url(query)
        try:
            response = get_json(url)
        except Exception as error:
            errors.append(f"{query}: {type(error).__name__}: {error}")
            continue
        if not isinstance(response, list):
            errors.append(f"{query}: invalid LandsD response")
            continue
        for row in response:
            if not isinstance(row, dict):
                continue
            label = f"{row.get('nameZH') or ''} {row.get('nameEN') or ''}"
            if normalize(row.get("districtZH")) != normalize(district_zh) or not TOILET_LABEL.search(label) or VAGUE_LABEL.search(label):
                continue
            if not isinstance(row.get("x"), (int, float)) or not isinstance(row.get("y"), (int, float)):
                continue
            found.append({**row, "sourceQueryUrl": url})
    return found, errors


def haversine_metres(left: tuple[float, float], right: tuple[float, float]) -> float:
    lat1, lng1, lat2, lng2 = *(math.radians(value) for value in (*left, *right)),
    delta_lat = lat2 - lat1
    delta_lng = lng2 - lng1
    value = math.sin(delta_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lng / 2) ** 2
    return 6_371_000 * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))


def load_existing_exact_points() -> list[dict[str, Any]]:
    sources = [
        (ROOT / "public/pages-data/public-toilets.json", "records"),
        (ROOT / "public/pages-data/lcsd-park-washrooms.json", "facilities"),
        (ROOT / "data/lcsd-named-toilet-points.json", "points"),
        (ROOT / "public/pages-data/afcd-country-park-toilets.json", "facilities"),
        (ROOT / "public/had-community-toilets.json", "records"),
        (ROOT / "public/pages-data/afcd-nature-centre-toilets.json", "records"),
        (ROOT / "public/pages-data/afcd-long-valley-temporary-toilets.json", "records"),
    ]
    points: list[dict[str, Any]] = []
    for path, key in sources:
        if not path.exists():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        records = payload.get(key, [])
        for record in records:
            if record.get("locationPrecision") in {"venue", "venue-uncertain"}:
                continue
            latitude, longitude = record.get("latitude"), record.get("longitude")
            name = str(record.get("name") or "").strip()
            if name and isinstance(latitude, (int, float)) and isinstance(longitude, (int, float)):
                points.append({"name": name, "latitude": float(latitude), "longitude": float(longitude)})
    return points


def duplicates_existing_toilet(left: dict[str, Any], right: dict[str, Any]) -> bool:
    distance = haversine_metres((left["latitude"], left["longitude"]), (right["latitude"], right["longitude"]))
    if distance <= EXISTING_EXACT_POINT_METRES:
        return True
    left_name = comparable_toilet_name(left.get("name"))
    right_name = comparable_toilet_name(right.get("name"))
    return (
        len(left_name) >= 2
        and left_name == right_name
        and distance <= EXISTING_SAME_TOILET_METRES
    )


def transform(candidate: dict[str, Any]) -> dict[str, Any]:
    query = urllib.parse.urlencode({"inSys": "hkgrid", "outSys": "wgsgeog", "e": candidate["x"], "n": candidate["y"]})
    transform_url = TRANSFORM_URL + "?" + query
    result = get_json(transform_url)
    latitude, longitude = float(result["wgsLat"]), float(result["wgsLong"])
    min_lat, max_lat, min_lng, max_lng = HONG_KONG_BOUNDS
    if not (min_lat <= latitude <= max_lat and min_lng <= longitude <= max_lng):
        raise ValueError(f"outside Hong Kong: {candidate.get('nameZH')} ({latitude}, {longitude})")
    stable = f"{candidate.get('nameZH')}|{candidate.get('nameEN')}|{candidate['x']:.2f}|{candidate['y']:.2f}"
    return {
        "id": "landsd-map-toilet-" + hashlib.sha256(stable.encode("utf-8")).hexdigest()[:16],
        "kind": "landsdMapToilet",
        "name": str(candidate.get("nameZH") or candidate.get("nameEN") or "公廁").strip(),
        **({"nameEn": str(candidate.get("nameEN")).strip()} if str(candidate.get("nameEN") or "").strip() else {}),
        **({"address": str(candidate.get("addressZH")).strip()} if str(candidate.get("addressZH") or "").strip() else {}),
        **({"addressEn": str(candidate.get("addressEN")).strip()} if str(candidate.get("addressEN") or "").strip() else {}),
        "latitude": latitude,
        "longitude": longitude,
        "locationPrecision": "toilet",
        "source": "地政總署 GeoInfo Map 位置搜尋",
        "sourceQueryUrl": candidate["sourceQueryUrl"],
        "transformUrl": transform_url,
    }


def main() -> int:
    candidates: list[dict[str, Any]] = []
    errors: list[str] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = [pool.submit(search_district, zh, en) for zh, en in DISTRICTS]
        for future in concurrent.futures.as_completed(futures):
            found, failed = future.result()
            candidates.extend(found)
            errors.extend(failed)
    if errors:
        raise RuntimeError("LandsD search did not complete cleanly; no snapshot was written:\n" + "\n".join(errors))

    grouped: dict[tuple[str, str, float, float], dict[str, Any]] = {}
    for candidate in candidates:
        key = (normalize(candidate.get("nameZH")), "", float(candidate["x"]), float(candidate["y"]))
        grouped.setdefault(key, candidate)

    transformed: list[dict[str, Any]] = []
    transform_errors: list[str] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = [pool.submit(transform, candidate) for candidate in grouped.values()]
        for future in concurrent.futures.as_completed(futures):
            try:
                transformed.append(future.result())
            except Exception as error:
                transform_errors.append(f"{type(error).__name__}: {error}")
    if transform_errors:
        raise RuntimeError("LandsD coordinate conversion did not complete cleanly; no snapshot was written:\n" + "\n".join(transform_errors))

    existing = load_existing_exact_points()
    new_records = [record for record in transformed if not any(duplicates_existing_toilet(record, point) for point in existing)]
    new_records.sort(key=lambda record: (record["name"], record["id"]))
    payload = {
        "source": "地政總署 GeoInfo Map 位置搜尋及香港測繪處官方坐標轉換服務",
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "audit": {
            "districtQueries": len(DISTRICTS) * 3,
            "rawExactLabelMatches": len(candidates),
            "uniqueExactLabelMatches": len(transformed),
            "existingExactPointsChecked": len(existing),
            "existingExactPointsExcluded": len(transformed) - len(new_records),
            "newExactPoints": len(new_records),
            "searchRule": "district query + non-vague official toilet label + official HK Grid coordinate",
            "dedupeRule": "exclude any existing exact app toilet within 20 metres, or one with the same normalised name within 150 metres; venue-level grey points do not suppress a new exact map label",
        },
        "records": new_records,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)
    print(json.dumps(payload["audit"], ensure_ascii=False, indent=2))
    print(f"Wrote {len(new_records)} LandsD exact supplementary toilet points to {OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise
