# 港鐵飲水機：資料來源、場地座標與使用限制

本資料集把港鐵官方中英文飲水機名錄，連接至港鐵官方站碼及地政總署的車站／出口場地座標，供地圖顯示和尋找補水地點。**地圖標記不是飲水機本體的精確 GPS，機位數亦不是飲水機部數。** 到站後應按官方「車站大堂、出口、非付款區」描述及現場指示尋找。

建構程式為 `lib/mtr-drinking-water.mjs` 的 `buildMtrDrinkingWater()`；輸出為 `public/pages-data/mtr-drinking-water.json`。本說明依據該實作與現有 snapshot 編寫，沒有另行搜尋或採用非官方補點資料。

## 1. 官方來源各自提供甚麼

| 來源 | 官方網址 | 用途與界線 |
| --- | --- | --- |
| 港鐵中文飲水機名錄 | <https://www.mtr.com.hk/ch/customer/services/water_dispenser.html> | 路綫、車站及大堂／出口／非付款區文字位置；不是逐機 GPS 或機數清單。 |
| 港鐵英文飲水機名錄 | <https://www.mtr.com.hk/en/customer/services/water_dispenser.html> | 與中文來源按車站、路綫及出口核對，保留雙語描述。 |
| 港鐵路綫與車站 CSV | <https://opendata.mtr.com.hk/data/mtr_lines_and_stations.csv> | `Line Code`、`Station Code`、`Chinese Name`、`English Name`；用來確認雙語站名與跨線車站身分，不提供飲水機座標。 |
| 港鐵開放資料目錄 | <https://data.gov.hk/en-data/dataset/mtr-data-routes-fares-barrier-free-facilities> | 站碼 CSV 的官方資料集說明。 |
| 地政總署 Location Search API | <https://www.map.gov.hk/gs/api/v1.0.0/locationSearch> | 以 `q=港鐵{中文站名}站&lang=zh-Hant` 查詢車站／出口；只選中英文名稱均精確吻合的結果。 |
| 地政總署位置搜尋資料集 | <https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-development-location-search-api> | Location Search API 的官方資料集說明。 |
| 地政總署座標轉換 API | <https://www.geodetic.gov.hk/transform/v2/> | 把位置搜尋結果的 HK1980 Grid 東距、北距轉換成 WGS84 經緯度。 |
| 地政總署座標轉換資料集 | <https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-coordinates-transformation-api> | 座標轉換 API 的官方資料集說明。 |

所有上述來源均使用官方 HTTPS 網址。每個已映射記錄保留 `sourceUrl` 及帶有實際查詢參數的 `coordinateSourceUrl`；`coordinateSource` 另列出來源 API 與資料集網址。

### `officialMapUrl` 是名錄，不是平面圖

目前 lib 把記錄的 `officialMapUrl` 設為港鐵中文飲水機名錄網址，與 `sourceUrl` 相同。這是一個沿用的欄位名稱，**連結內容是官方名錄，不是車站平面圖、站內導向圖或已驗證的機器定位圖**。不可因欄位叫 `officialMapUrl` 便把該頁描述為「平面圖」，亦不可猜測個別車站圖紙 URL。站內實際尋路仍以名錄文字及現場指示為準。

## 2. 雙語配對、跨線去重與機位定義

1. 讀取兩個官方語言頁面的飲水機表格，確認路綫、車站、出口，以及「車站大堂／Station Concourse」和「非付款區／Unpaid Area」證據。表格結構或必要欄位不符時會拋錯，不靜默猜讀。
2. 使用官方站碼 CSV，把中英文站名各自解析成唯一車站站碼，並檢查該車站屬於來源列的路綫。跨線站碼合併時保留其路綫列表。
3. 中英文列以「站碼 + 路綫 + 出口」配對，**不是以列順序配對**。即使兩個語言頁的路綫或列順序不同，也必須保留正確配對。缺少或有多個候選配對均會拋錯。
4. 使用「站碼 + 正規化中文位置 + 正規化英文位置」辨識同一機位。相同機位若在多條路綫重複列出，只輸出一筆，但保留全部 `lineCodes` 和 `sourceRows`。同站不同出口不應自動合併；如同出口出現多個不同位置而 ID 不足以區分，須人工檢視，不能靜默覆蓋。

`sourceRows` 保留中英文原始站名、位置、雙語路綫名稱，以及各自的 `tcRowNumber`、`enRowNumber`。列號指 parser 擷取的機位列次序，**不是 HTML 檔案行號，也不包括路綫標題列**。來源中的重複英文 `Station Station` 後綴可用於站名解析，但證據文字不應因此被改寫；中文位置的已知「車站大…出口」排印差異亦保留，並由對應英文大堂描述提供配對證據。

一筆輸出代表一個可辨識的官方補水**機位／位置描述**。官方名錄不是逐部設備盤點，因此 `unitCount` 一律為 `null`，不可把一筆資料轉成「1 部機」、把跨線重複列相加，或把機位總數標示成機器總數。

## 3. 場地座標選擇與轉換

### 先精確出口，再精確車站

`selectMtrVenueCoordinate()` 只接受同一筆地政總署結果的中英文名稱均吻合：

- 優先出口：例如 `港鐵金鐘站-B進出口` 與 `MTR Admiralty Station-B Access`。
- 若沒有精確出口候選，再嘗試車站：例如 `港鐵金鐘站` 與 `MTR Admiralty Station`。

名稱比對會正規化空白、Unicode NFKC 及英文大小寫，但不使用模糊、距離最近、單語名稱或「附近」搜尋結果代替。不同出口亦不能混用。同一精確名稱有多筆但座標完全相同時可以去重；如座標不同則屬歧義，不能任選第一筆。

Grid `x`、`y` 必須是有限數值，字串、`null`、缺值、`NaN` 或無限值均被拒絕。精確出口候選若本身有無效座標或互相矛盾，會保留失敗理由，而不是繼續用車站座標掩蓋問題。只有不存在精確出口候選時，才可採用精確車站候選。

### HK1980 Grid → WGS84

位置搜尋回應提供場地的 HK1980 Grid 座標；建構程式把 `x` 當東距 `e`、`y` 當北距 `n`，呼叫地政總署轉換 API：

```text
https://www.geodetic.gov.hk/transform/v2/?inSys=hkgrid&outSys=wgsgeog&e={x}&n={y}
```

使用回應 `wgsLat` 作 `latitude`、`wgsLong` 作 `longitude`。輸出還會檢查經緯度為有限數值，並位於程式採用的香港範圍內（緯度 22.13–22.57、經度 113.8–114.5）。沒有自行把 Grid 值當成經緯度，也沒有用商業地圖、推測站中心或其他非官方坐標補缺。

每個已映射機位在 `audit.locations` 保留 `coordinateKind`（`exit` 或 `station`）、官方匹配名稱及 Grid `coordinateMatch`、搜尋與轉換 URL、轉換後經緯度，以及搜尋／轉換回應的 SHA-256。`audit.sourceEvidence` 另存中文頁、英文頁、CSV 的 SHA-256 及官方站碼數。這些摘要有助辨識建構時使用的回應版本，但**不是原始回應全文、即時有效性證明或獨立位置測量**。離線測試可以核對格式與內部一致性，不會重新呼叫官方 API 來驗證轉換結果。

### 不能匹配時保留 `unmapped`

無精確雙語車站／出口匹配、座標歧義、無效 Grid 或轉換結果等情況，不會憑空生成點位。可預期的座標搜尋／轉換失敗理由會保存在 `unmapped`；該項仍保留站碼、站名、出口、路綫、雙語位置、來源列及搜尋網址，不附經緯度。來源 schema 改動、語言名錄無法配對，或網絡請求失敗等則會令整次建構拋錯，不能理解為所有失敗都會轉成 `unmapped`。

重要一致性是：

```text
mappedLocationCount + unmappedLocationCount = listedLocationCount
中／英文來源列總數 - listedLocationCount = duplicateLineRowsRemoved
venueExitCoordinateCount + venueStationCoordinateCount = mappedLocationCount
```

`stationCount` 按去重站碼計算，與機位數不是必然一樣。若同一站日後有多個不同機位，站數可能少於機位數；同站也可能同時出現在 mapped 和 unmapped 的站數統計，不能把兩邊站數直接相加當總站數。

## 4. 現有 snapshot 的實際統計

下表對應 `generatedAt = 2026-11-02T20:03:16.079Z` 的 snapshot，是該次建構觀察值，**不是永久固定的官方數字或未來更新的測試門檻**。更新後應以最新 snapshot 的 `audit` 為準，不硬碼「27 筆」或本次站數。

| 項目 | 本次數值 |
| --- | ---: |
| 官方站碼 CSV 的去重站碼數（整份 CSV，不代表均設飲水機） | 97 |
| 中文名錄機位列 | 36 |
| 英文名錄機位列 | 36 |
| 跨線重複來源列移除數 | 10 |
| 名錄去重機位 `listedLocationCount` | 26 |
| 名錄去重車站 `stationCount` | 26 |
| 已映射機位／車站 | 26／26 |
| 未映射機位／車站 | 0／0 |
| 出口級場地座標 | 21 |
| 車站級場地座標 | 5 |
| 飲水機本體精確座標 | 0 |
| 飲水機實際部數 | 未公布，`unitCount: null` |

本次 5 個車站級後備座標為會展（Exhibition Centre）、坑口（Hang Hau）、何文田（Ho Man Tin）、南昌（Nam Cheong）及北角（North Point）。這只表示此次搜尋有可用的精確車站名稱匹配，而沒有採用精確出口匹配，並非聲稱這些站沒有該出口。其餘 21 個標記雖採用出口場地座標，仍不是出口內飲水機的精確位置。

本次 `unmapped` 為空，但程式與離線 fixture 仍覆蓋未匹配、無證據及歧義／無效座標處理；不能因此刪除未映射機制或假設下次必定全數可映射。

## 5. 精度、設備資料與開放狀態限制

- **場地級，不是機器 GPS。** `locationPrecision` 及座標來源精度標記為 `building`；`coordinateKind` 才再區分站或出口。即使經緯度有多個小數位，也不表示量度過機器位置，更不能推論樓層、站內步行路線或無障礙路線。中英文 `locationNote` 明確提醒使用官方大堂／出口描述尋機。
- **沒有逐機過濾或水溫資料。** 此資料集沒有可驗證的 per-machine filtration 或 temperature 資料，因此 `filterStatus: 'notPublished'`，`temperatureTc`／`temperatureEn` 留空。這不是聲稱機器沒有過濾器，也不能拿一般宣傳文字套用為每台的設備規格。
- **非付款區不等於全天候自由出入。** 位置描述為車站大堂非付款區，使用仍受港鐵車站開放時間、現場安排及可能的臨時限制影響；不保證 24 小時可達。`serviceHoursTc`／`serviceHoursEn` 留空，因沒有逐機確實服務時間，不應填入自行推算的班次時間。
- **不保證即時開放或可用。** Snapshot 是建構時的名錄快照，並非設備遙測、現場巡查或即時開關狀態。`temporaryClosed: false` 只反映名錄未列停用公告，不能解讀成「目前正常運作」。到場仍可能遇上維修、臨時封閉、機器故障或其他限制。
- 請自備水樽，遵守港鐵與現場安排。來源更新、站內改動與實際設備狀態均可能先於本站 snapshot 更新。

## 6. 離線回歸測試

在專案根目錄執行：

```sh
node scripts/check-mtr-drinking-water.mjs
```

測試只用 Node 內建 `assert`、檔案讀取及 lib 的純函式，不依賴第三方測試框架，不呼叫 `buildMtrDrinkingWater()`，並禁止 `fetch`。合成 fixture 驗證中英文不同列／路綫順序仍正確配對、跨線去重保留來源證據、同站不同出口分開、schema／雙語歧義拒絕、精確出口優先於精確車站、模糊／無效／多座標匹配拒絕，以及未匹配機位保留為 `unmapped`。

真實 snapshot 存在時，額外檢查非空及 mapped + unmapped 計數、去重站碼／來源列完整性、雙語非付款區大堂證據、官方 HTTPS URL、Grid 轉換參數、SHA-256 格式、audit 與記錄座標一致、`unitCount: null`，以及不宣稱精確機器 GPS／逐機規格／即時開放的欄位語意。測試不固定官方站數或機位數；snapshot 不存在時明確輸出 `SKIP`，仍執行純函式 fixture，不會自行連網建構。
