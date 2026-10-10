#!/usr/bin/env python3
"""Refresh exact named LCSD park-toilet points from LandsD's official gazetteer.

This is deliberately separate from the normal Pages build: run it manually when
refreshing the named-POI index, review the diff, then run pnpm build:pages.
"""
from __future__ import annotations

import concurrent.futures
import hashlib
import json
import math
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
VENUE_SNAPSHOT = ROOT / "public/pages-data/lcsd-park-washrooms.json"
OUTPUT = ROOT / "data/lcsd-named-toilet-points.json"
SEARCH_URL = "https://www.map.gov.hk/gs/api/v1.0.0/locationSearch"
TRANSFORM_URL = "https://www.geodetic.gov.hk/transform/v2/"
HEADERS = {
    "Accept": "application/json",
    "Referer": "https://www.map.gov.hk/",
    "User-Agent": "Mozilla/5.0 ParkPulse HK official-data audit",
}
TOILET_LABEL = re.compile(r"廁所|洗手間|公廁|toilet|washroom|restroom|latrine|lavatory", re.I)
VAGUE_LABEL = re.compile(
    r"附近|旁邊|旁|對面|近|側|near|nearby|adjacent|beside|next\s+to|opposite|outside",
    re.I,
)
HONG_KONG_BOUNDS = (21.5, 23.0, 113.7, 114.6)
MAX_WORKERS = 4
MAX_ATTEMPTS = 5


def normalize(value: Any) -> str:
    return "".join(
        char
        for char in unicodedata.normalize("NFKC", str(value or "")).lower()
        if char.isalnum()
    )


def grid_distance_meters(left: dict[str, Any], right: dict[str, Any]) -> float:
    return math.hypot(left["hkGridE"] - right["hkGridE"], left["hkGridN"] - right["hkGridN"])


def get_json(url: str) -> Any:
    last_error: Exception | None = None
    for attempt in range(MAX_ATTEMPTS):
        try:
            request = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(request, timeout=45) as response:
                payload = response.read()
            return json.loads(payload)
        except Exception as error:
            last_error = error
            if attempt + 1 < MAX_ATTEMPTS:
                time.sleep(0.5 * (attempt + 1))
    assert last_error is not None
    raise last_error


def search_url(query: str) -> str:
    return SEARCH_URL + "?" + urllib.parse.urlencode({"q": query, "n": 50, "lang": "tc"})


def is_exact_venue_toilet(row: dict[str, Any], venue: dict[str, Any]) -> bool:
    name_zh = str(row.get("nameZH") or "")
    name_en = str(row.get("nameEN") or "")
    label = f"{name_zh} {name_en}"
    if not TOILET_LABEL.search(label) or VAGUE_LABEL.search(label):
        return False
    if normalize(row.get("districtZH")) != normalize(venue.get("district")):
        return False
    row_name = normalize(label)
    venue_zh = normalize(venue.get("name"))
    venue_en = normalize(venue.get("nameEn"))
    return bool(
        (len(venue_zh) >= 4 and venue_zh in row_name)
        or (len(venue_en) >= 6 and venue_en in row_name)
    )


def inspect_venue(venue: dict[str, Any]) -> tuple[list[dict[str, Any]], int, list[str]]:
    attempts: list[tuple[str, str]] = []
    chinese_name = str(venue.get("name") or "").strip()
    english_name = str(venue.get("nameEn") or "").strip()
    if chinese_name:
        attempts.append((f"{chinese_name} 廁所", "zh-Hant"))
    if english_name:
        attempts.append((f"{english_name} toilet", "en"))

    exact: list[dict[str, Any]] = []
    vague_count = 0
    errors: list[str] = []
    for query, _language in attempts:
        url = search_url(query)
        try:
            payload = get_json(url)
        except Exception as error:
            errors.append(f"{venue.get('name')}: {type(error).__name__}: {error}")
            continue
        if not isinstance(payload, list):
            errors.append(f"{venue.get('name')}: invalid LandsD response for {query}")
            continue
        for row in payload:
            if not isinstance(row, dict):
                continue
            label = f"{row.get('nameZH') or ''} {row.get('nameEN') or ''}"
            same_district = normalize(row.get("districtZH")) == normalize(venue.get("district"))
            if same_district and TOILET_LABEL.search(label) and VAGUE_LABEL.search(label):
                vague_count += 1
            if not is_exact_venue_toilet(row, venue):
                continue
            if not isinstance(row.get("x"), (int, float)) or not isinstance(row.get("y"), (int, float)):
                continue
            exact.append({
                "venueId": venue["id"],
                "venueName": venue["name"],
                "venueNameEn": venue.get("nameEn", ""),
                "venueDistrict": venue.get("district", ""),
                "nameZH": str(row.get("nameZH") or "").strip(),
                "nameEN": str(row.get("nameEN") or "").strip(),
                "addressZH": str(row.get("addressZH") or "").strip(),
                "addressEN": str(row.get("addressEN") or "").strip(),
                "districtZH": str(row.get("districtZH") or "").strip(),
                "districtEN": str(row.get("districtEN") or "").strip(),
                "hkGridE": float(row["x"]),
                "hkGridN": float(row["y"]),
                "sourceQueryUrl": url,
            })
        if exact:
            break
    return exact, vague_count, errors


def cluster_exact_points(candidates: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    groups: list[list[dict[str, Any]]] = []
    for candidate in candidates:
        key = (normalize(candidate["nameZH"]), normalize(candidate["nameEN"]))
        cluster = next((group for group in groups if
            (normalize(group[0]["nameZH"]), normalize(group[0]["nameEN"])) == key
            and all(grid_distance_meters(candidate, member) <= 50 for member in group)), None)
        if cluster is None:
            groups.append([candidate])
        else:
            cluster.append(candidate)
    return groups


def transform_point(candidate: dict[str, Any]) -> dict[str, Any]:
    query = urllib.parse.urlencode({
        "inSys": "hkgrid",
        "outSys": "wgsgeog",
        "e": candidate["hkGridE"],
        "n": candidate["hkGridN"],
    })
    url = TRANSFORM_URL + "?" + query
    result = get_json(url)
    latitude = float(result["wgsLat"])
    longitude = float(result["wgsLong"])
    min_lat, max_lat, min_lng, max_lng = HONG_KONG_BOUNDS
    if not (min_lat <= latitude <= max_lat and min_lng <= longitude <= max_lng):
        raise ValueError(f"Transformed coordinate is outside Hong Kong: {candidate['nameZH']} ({latitude}, {longitude})")
    stable = "|".join((candidate["venueId"], candidate["nameZH"], f"{candidate['hkGridE']:.2f}", f"{candidate['hkGridN']:.2f}"))
    point_id = "lcsd-named-" + hashlib.sha256(stable.encode("utf-8")).hexdigest()[:16]
    return {
        "id": point_id,
        "venueId": candidate["venueId"],
        "venueName": candidate["venueName"],
        "venueNameEn": candidate["venueNameEn"],
        "name": candidate["nameZH"],
        "nameEn": candidate["nameEN"],
        **({"address": candidate["addressZH"]} if candidate["addressZH"] else {}),
        **({"addressEn": candidate["addressEN"]} if candidate["addressEN"] else {}),
        "district": candidate["districtZH"],
        "districtEn": candidate["districtEN"],
        "latitude": latitude,
        "longitude": longitude,
        "hkGridE": candidate["hkGridE"],
        "hkGridN": candidate["hkGridN"],
        "sourceQueryUrl": candidate["sourceQueryUrl"],
        "transformUrl": url,
        "locationPrecision": "toilet",
    }


def main() -> int:
    snapshot = json.loads(VENUE_SNAPSHOT.read_text(encoding="utf-8"))
    venues = [
        record for record in snapshot.get("facilities", [])
        if record.get("kind") == "lcsdParkToilet" and record.get("locationPrecision") == "venue-uncertain"
    ]
    if len(venues) < 300:
        raise RuntimeError(f"Expected at least 300 official LCSD park venues, found {len(venues)}")

    candidates: list[dict[str, Any]] = []
    vague_count = 0
    errors: list[str] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = [pool.submit(inspect_venue, venue) for venue in venues]
        for index, future in enumerate(concurrent.futures.as_completed(futures), start=1):
            found, vague, failed = future.result()
            candidates.extend(found)
            vague_count += vague
            errors.extend(failed)
            if index % 50 == 0 or index == len(venues):
                print(f"Scanned {index}/{len(venues)} venues; exact named hits={len(candidates)}; request errors={len(errors)}", flush=True)

    if errors:
        raise RuntimeError("Official LandsD search did not complete cleanly; no index was written:\n" + "\n".join(errors))
    if len(candidates) < 80:
        raise RuntimeError(f"Exact named point count unexpectedly low: {len(candidates)}")

    clusters = cluster_exact_points(candidates)
    if len(clusters) < 75:
        raise RuntimeError(f"Unique named point count unexpectedly low: {len(clusters)}")

    transformed: list[dict[str, Any]] = []
    transform_errors: list[str] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = [pool.submit(transform_point, min(group, key=lambda item: (not bool(item["addressZH"]), item["hkGridE"], item["hkGridN"]))) for group in clusters]
        for future in concurrent.futures.as_completed(futures):
            try:
                transformed.append(future.result())
            except Exception as error:
                transform_errors.append(f"{type(error).__name__}: {error}")
    if transform_errors:
        raise RuntimeError("Official HK Grid conversion did not complete cleanly; no index was written:\n" + "\n".join(transform_errors))

    transformed.sort(key=lambda point: (point["district"], point["venueName"], point["name"], point["id"]))
    payload = {
        "source": "地政總署位置搜尋及香港測繪處官方坐標轉換服務",
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "audit": {
            "officialLcsdVenueRecordsScanned": len(venues),
            "rawExactNamedMatches": len(candidates),
            "uniqueExactNamedPointsAfterSameName50mDeduplication": len(transformed),
            "nonExactOrNearbyLabelsNotUsed": vague_count,
            "searchOrTransformErrors": 0,
            "searchRule": "exact toilet label + exact LCSD venue name + exact district; nearby/adjacent labels excluded",
            "dedupeRule": "same Chinese and English official name, all clustered coordinates within 50 metres",
        },
        "points": transformed,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)
    print(json.dumps(payload["audit"], ensure_ascii=False, indent=2))
    print(f"Wrote {len(transformed)} official named toilet points to {OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise
