# ParkPulse HK 資料來源與更新索引

**用途：** 讓之後接手的 AI 或開發者知道每項資料來自哪裡、要改哪個程式、如何更新快照、資料會顯示在哪裡，以及座標和新鮮度有什麼限制。

本索引按目前專案程式碼及資料檔整理，更新基準日為 **2026-10-10**。列出的 URL 是倉庫中實際配置的來源或對外連結；本文件不保證上游此刻可連線、資料仍維持相同格式，或服務方沒有更改條款。每次更新前仍要先查看官方來源與回應格式。請把程式和產生器視為資料流程的真實來源，不要只手改 `public/` 裏的 JSON。

## 接手前先看

- [`README.md`](../README.md)：部署、GitHub Pages 更新時程和本機啟動方法。
- [`plan.md`](../plan.md) 與 [`TODO.md`](../TODO.md)：產品約束和未完成工作。
- [政府及公營機構公廁來源盤點](2026-10-10-government-public-toilet-source-survey.md)：有公廁資料但尚未精確落點或接入地圖的部門／機構。
- [公園洗手間涵蓋紀錄](2026-10-10-government-park-washroom-coverage.md)：康文署、漁護署資料及濕地公園缺口。

## 一次更新多份靜態資料

- `pnpm build:pages`：先執行 `scripts/build-pages-data.mjs` 更新 Pages 用的資料快照，再執行 TypeScript 檢查及 Pages 建置。這是一般資料更新的主要入口。
- `node scripts/build-pages-data.mjs`：只執行資料快照更新，不做 TypeScript 和前端建置。每個快照若上游失敗且舊檔存在，`refreshFileOrKeep` 會保留舊檔並輸出警告；不能只看指令 exit code 就假設每項資料都更新成功，要看日誌及各檔 `generatedAt`／資料期數。
- [`README.md`](../README.md) 記錄 GitHub Actions 會在推送 `main`、每 6 小時及手動執行時重新抓取公開資料並發佈網站。這是 Pages 工作流程，不代表所有即時服務在同一頻率更新。
- Pages 會把快照放進靜態網站；容器版則由 `server.mjs` 提供部分即時 API，並各自採用記憶體快取。兩種模式的更新方式不同，修改時要保留兩邊。

## 實際使用中的資料管線

### 停車場名單與即時空位

- **官方來源：** [政府停車場空位資料集](https://data.gov.hk/tc-data/dataset/hk-dpo-datagovhk1-carpark-info-vacancy)、[info API](https://api.data.gov.hk/v1/carpark-info-vacancy/?data=info&lang=zh_TW) 及 [vacancy API](https://api.data.gov.hk/v1/carpark-info-vacancy/?data=vacancy)。
- **更新位置：** `src/api/carparks.ts`；Pages 快照由 `scripts/build-pages-data.mjs` 取得 `data=info`。執行 `pnpm build:pages`。
- **檔案／消費端：** `public/carpark-info.json` 保存基本名單；前端從政府 API 取得即時 vacancy。基本資料另會合併 `public/operator-rates.json` 及官方補充停車場資料。`src/api/carparks.ts` 的基本資料 localStorage 快取有效 24 小時；空位請求沒有相同的本機快照回退。
- **注意：** 即時空位與基本名單是兩種資料，不要用較舊快照冒充即時空位。資料集或 API 欄位改動時，檢查 `scripts/check-vacancy.mjs`、`scripts/check-total-spaces.mjs` 及 `scripts/check-pages-build.mjs`。

### 政府產業署停車場及補充場地

- **官方來源：** [政府產業署停車場 JSON](https://www.gpa.gov.hk/doc/psi/ds/psi-t-cp_TC.json)、[data.gov.hk 資料集頁](https://data.gov.hk/tc-data/dataset/hk-gpa-msd-gpa-psi-t-cp)。
- **座標服務：** [地政總署位置搜尋](https://www.map.gov.hk/gs/api/v1.0.0/locationSearch) 及 [香港測繪處座標轉換](https://www.geodetic.gov.hk/transform/v2/)。`lib/gpa-carparks.mjs` 以停車場名稱搜尋，優先同名結果；沒有同名結果時會取第一個結果，再由 HK Grid 轉為 WGS84。這個備援可能配錯同名地點，更新後須抽查名稱與地圖位置，不能把搜尋服務結果稱為原始停車場座標。
- **補充個案：** 明雅停車場來自[領展場地頁](https://www.linkhk.com/tc/parking/4324)及領展資料服務。API 基底是 `https://apim-gateway-prd.azure.linkreit.com/MPCMS/PRD2/parking/`，在 `lib/operator-rates.mjs`；`lib/official-static-carparks.mjs` 以場地編號 `4324` 組出請求。
- **更新位置／檔案：** `lib/gpa-carparks.mjs`、`lib/official-static-carparks.mjs`；`pnpm build:pages` 產生 `public/pages-data/official-static-carparks.json`。
- **注意：** 政府產業署記錄的開放狀態標示為未知，亦沒有即時空位；明雅的空位是快照。GPA 每筆地址搜尋或座標轉換失敗都可能令整份來源更新失敗。

### 停車場收費

- **可自動擷取：** 領展 API 基底 `https://apim-gateway-prd.azure.linkreit.com/MPCMS/PRD2/parking/`，依官方停車場網址中的場地編號查詢；[信和中文](https://www.sino-propertyservices.com/tc/parking-services/portfolio)及[英文](https://www.sino-propertyservices.com/en/parking-services/portfolio)官方場地頁。
- **程式內的官方價目覆寫：** `lib/official-rate-overrides.mjs` 列出[港鐵](https://www.mtr.com.hk/ch/customer/services/stations_carpark.html)、[香港國際機場](https://www.hongkongairport.com/en/transport/parking/parking-charges.page)、[港珠澳大橋](https://www.hzmbparking.com.hk/zh-hk/parking-rates)、[Mack](https://www.mackcarpark.com.hk/big5/pricelist.php)、[德福廣場](https://www.telford-plaza.com/tch/parking)、[利園](https://www.leegardens.com.hk/car-park-promotion.aspx?lang=zh-HK)及[西九文化區](https://www.westk.hk/tc/parking)的官方來源連結。這些價目目前是程式內固定文字，並非每次建置都抓取來源網頁。
- **更新位置／檔案：** `lib/operator-rates.mjs`、`lib/official-rate-overrides.mjs`；`node scripts/build-operator-rates.mjs` 會重建 `public/operator-rates.json`。全量更新則用 `pnpm build:pages`。前端在 `src/api/carparks.ts` 依停車場 ID 合併快照。
- **注意：** 修改固定價目時，先回到各營辦商官方頁面核對適用日子、時段及車種，再改價目文字與來源連結。`checkedAt` 是產生日期，不代表固定價目在當天已自動核實。**InPark 並非目前程式中的收費來源**；如將來加入用戶提供的價格，需明確標示為非官方／用戶資料，不能混稱官方價目。

### 食環署公廁

- **官方來源：** [食環署公廁 XML](https://www.fehd.gov.hk/tc_chi/map/fehd_map_c.xml)。
- **更新位置：** `lib/public-toilets.mjs` 解析 XML；`server.mjs` 的 `/api/public-toilets` 提供容器版；`scripts/build-pages-data.mjs` 建置 Pages 快照。執行 `pnpm build:pages`。
- **檔案／更新模式：** `public/pages-data/public-toilets.json`。容器版首次請求抓取來源，成功資料記憶體快取 1 小時；Pages 讀建置快照。
- **精度規則：** 保留來源 `map_coordinate` 的緯度、經度，程式不做地理編碼；越出香港檢查範圍的座標會丟棄。來源更新失敗時，已有容器快取或 Pages 檔案會保留舊資料。

### 康文署室內場館公廁

- **快照記錄的來源：** [康文署場地 JSON](https://www.lcsd.gov.hk/datagovhk/venue/venue.json)；場館詳情頁連結存於各記錄的 `sourceUrl`。快照來源說明亦提到政府地址查詢服務。
- **檔案／消費端：** `public/lcsd-washroom-venues.json` 由 `src/api/lcsdVenues.ts` 載入。這些座標是**場館位置**，不是場館內廁所的精確座標；介面須保留場地級標籤。
- **重要維護缺口：** 目前倉庫有讀取器及 `pnpm test:lcsd-venues`，但未找到可重現的快照產生器／更新命令。不要把測試或 `pnpm build:pages` 說成會刷新此快照。若需更新，先建立可重現的來源下載、地址配對和座標驗證步驟，再更新資料；不確定的場館位置不要補點。

### 康文署戶外公園及場地公廁

- **官方來源：** [data.gov.hk 康文署資料集目錄](https://data.gov.hk/api/v1/datasets)（依 provider `hk-lcsd` 分頁），實際場地 JSON 由 [康文署資料檔案目錄](https://www.lcsd.gov.hk/datagovhk/facility/) 依資料集 ID 組成。
- **更新位置／檔案：** `lib/lcsd-park-washrooms.mjs`；`pnpm build:pages` 或 `node scripts/build-pages-data.mjs` 產生 `public/pages-data/lcsd-park-washrooms.json`。讀取、去重及合併位置在 `src/api/lcsdVenues.ts`。
- **精度規則：** 解析官方經緯度或度分秒座標；只保留公園／戶外場地、有人類公廁欄位且座標有效的記錄。寵物廁所會排除。建置器有資料量門檻，檔案讀取失敗時可能略過單一來源；若達不到整體門檻則保留舊快照或令首次建置失敗。
- **驗證：** `pnpm test:lcsd-park-washrooms`。

### 漁護署郊野公園公廁

- **官方來源：** [CSDI 資料集頁](https://portal.csdi.gov.hk/csdi-webpage/dataset/afcd_rcd_1635136427551_29173)、[季度檔案清單 API](https://portal.csdi.gov.hk/csdi-webpage/archivedDatasetFileList/afcd_rcd_1635136427551_29173)；實際下載 URL 由清單回傳的最新 converted GeoJSON 檔案提供。漁護署亦有[郊野公園廁所資料頁](https://www.afcd.gov.hk/tc_chi/country/cou_vis/cou_vis_rec/cou_toi.html)。
- **更新位置／檔案：** `lib/afcd-country-park-toilets.mjs`；`pnpm build:pages` 或 `node scripts/build-pages-data.mjs` 更新 `public/pages-data/afcd-country-park-toilets.json`。前端於 `src/api/lcsdVenues.ts` 合併。
- **精度規則：** 使用來源 GeoJSON 的 Point 座標，不自行估算或以園區中心代替；只保留有效香港範圍點位。資料標示季度，更新時使用最新季度轉換檔。
- **已知缺口：** 香港濕地公園雖有洗手間資料，但目前 AFCD 公廁快照沒有其廁所級點位。園方官方示意圖不是 WGS84 點位資料；使用者已向園方查詢，等候回覆。詳見[來源盤點](2026-10-10-government-public-toilet-source-survey.md)。
- **驗證：** `pnpm test:afcd-country-park-toilets`。

### 民政事務總署社區會堂／中心暢通易達洗手間

- **官方清單：** [英文社區會堂／中心名單](https://www.had.gov.hk/psi/chcc/chsccs_en.csv)、[中文版名單](https://www.had.gov.hk/psi/chcc/chsccs_tc.csv)、[暢通易達設施 CSV](https://www.had.gov.hk/psi/barrier-free-facilities-in-community-halls-community-centres/barrier_free_facilities_in_community_halls_community_centres_en.csv)。暢通易達設施以官方英文場地名稱配對；中英文名單必須以「參考編號＋地區」配對，不能只用參考編號，因短碼 `KT` 可在不同區重複。只納入設施欄明列 `Accessible Toilet` 的中心。
- **更新位置／輸出：** `lib/had-community-toilets.mjs` 下載及配對 CSV，並以 [地政總署位置搜尋 API](https://www.map.gov.hk/gs/api/v1.0.0/locationSearch) 的精確英文場地名稱結果，再用[香港大地測量轉換服務](https://www.geodetic.gov.hk/transform/v2/)把 HK Grid 轉成 WGS84。`pnpm build:pages` 產生 `public/had-community-toilets.json`；前端透過 `src/api/additionalToilets.ts` 和 `src/hooks/useAdditionalToilets.ts` 載入。
- **座標／可用性限制：** 這些座標只代表社區中心／會堂，不是廁所所在房間；`locationPrecision: 'venue-uncertain'` 使用灰階虛線 marker、場館導航、不顯示廁所相片。來源只證明有暢通易達洗手間；沒有確定一般公眾能否直接使用，也沒有營業時間，卡片和 popup 必須保留提示。現行快照為 110 筆、18 個中英文區名；產生器最低要求 100 筆與 18 個官方英文區名，測試亦核對 18 個中文區名及觀塘／葵青不會因 `KT` 重號錯配，並拒絕非精確同名配對或無效座標。
- **驗證：** `pnpm test:had-community-toilets` 和 `pnpm test:washroom-icons`。

### 漁護署塱原自然生態中心訪客洗手間

- **設施來源：** [塱原自然生態中心官方設施頁](https://www.lvnp.gov.hk/tc/lvnc.html)列明訪客設施包括洗手間及其開放時間；[地政總署位置搜尋](https://www.map.gov.hk/gs/api/v1.0.0/locationSearch)明確回傳 `Toilet (Long Valley Nature Centre)`，地址為 `G/F, Long Valley Nature Centre`。HK Grid 轉 WGS84 後為 `22.506623894, 114.108754063`，是明確命名的廁所點，不是公園中心推算。
- **更新位置／輸出：** `lib/afcd-nature-centre-toilets.mjs`；`pnpm build:pages` 產生 `public/pages-data/afcd-nature-centre-toilets.json`。與民政署同由 `src/api/additionalToilets.ts` 載入，因本筆 `locationPrecision: 'toilet'` 保留精確廁所標記。驗證：`pnpm test:afcd-nature-centre-toilets`。
- **新界單車徑覆蓋限制：** [2024 年政府立法會答覆](https://www.info.gov.hk/gia/general/202406/12/P2024061200281.htm)指出沿線現有逾 100 個非臨時公廁主要由 FEHD 管理，另有 FEHD 新設 8 個公廁；同一答覆提到 AFCD 在塱原自然生態公園單車徑附近管理 3 處臨時廁所，但沒有逐點名稱或座標。現有 FEHD 快照可找到馬料水吐露港公路、科學園路、馬料水海濱、河上鄉單車徑旁及荃灣海興路等官方座標點。下方以灰階「園區位置」標出官方資料指出的三處臨時廁所近區；它不是精確廁所點，亦不代表塱原訪客中心那一筆。

### 塱原三處臨時廁所：官方園區位置灰階標記

- **存在依據：** [2024 年政府立法會答覆](https://www.info.gov.hk/gia/general/202406/12/P2024061200281.htm)提到漁護署在塱原自然生態公園近單車徑三處位置設有臨時廁所，未列逐點名稱／座標。
- **座標來源：** 漁護署[塱原自然生態公園 CSDI 官方資料集](https://data.gov.hk/tc-data/dataset/hk-afcd-afcdlist-lvnpcsdi)提供一個公園場地點；現行 WGS84 座標是 `22.508721, 114.112952`，不是三處廁所中任何一處，也不是塱原自然生態中心內的精確廁所。Esri HK 的轉換副本曾用作一次性座標核對，但其頁面標為 `Custom License` 且 REST metadata 的 `licenseInfo` 欄位沒有條款內容，因此不是本專案的建置或更新端點。
- **更新位置／輸出：** `lib/afcd-long-valley-temporary-toilets.mjs` 保存單一官方園區點常數，輸出 `public/pages-data/afcd-long-valley-temporary-toilets.json`；`pnpm build:pages` 重建快照，但不會自動下載第三方轉換副本。日後要更新座標，應由 CSDI 官方資料集頁面使用最新下載／GeoSpatial Service 的 WFS 核對；不要再用已於 2026-06-30 停用的 Data Query Service。前端經 `src/api/additionalToilets.ts` 及 `src/hooks/useAdditionalToilets.ts` 載入。回歸命令：`pnpm test:afcd-long-valley-temporary-toilets`。
- **再用與署名：** [CSDI 使用條款](https://portal.csdi.gov.hk/csdi-webpage/doc/TNC)容許免費瀏覽、下載、分發及重製資料，但要求清楚標明政府與 CSDI Portal、承認相關資料擁有者。CSDI [FAQ](https://portal.csdi.gov.hk/csdi-webpage/info/FAQ)要求署名文字為 `Common Spatial Data Infrastructure (CSDI) Portal`，並建議把 “CSDI Portal” 連到條款頁。洗手間模式 footer 現在顯示完整署名並連至條款；CSDI [GeoSpatial Services](https://portal.csdi.gov.hk/csdi-webpage/doc/GeoSpatialServices)列出 WFS、WMS 和 ArcGIS REST，未來只以官方服務更新。
- **顯示與限制：** `kind: afcdLongValleyTemporaryToilets`、`locationPrecision: venue-uncertain`，使用灰階／虛線 marker；卡片、popup、距離及導航均明示只到公園場地點，照片功能關閉。政府答覆年份是 2024；目前廁所仍否開放及營業時間沒有更新證據，應提示到場確認。收到 AFCD 個別座標後，另行改為三個精確廁所點，不能複製公園點三次。

### 環保署公共充電器

- **官方來源：** [環保署公共充電器 JSON](https://ev-charger.epd.gov.hk/resource/ev_charger_avail/ev_charger_avail.json)。
- **更新位置／輸出：** `lib/epd-ev-chargers.mjs` 轉換資料；`server.mjs` 的 `/api/ev-chargers` 服務容器版；`scripts/build-pages-data.mjs` 寫入 `public/pages-data/ev-chargers.json`。全量更新用 `pnpm build:pages`。
- **新鮮度／限制：** 容器版記憶體快取 5 分鐘；Pages 為建置快照。來源缺少中文場站名稱或座標非數值的記錄會被丟棄。資料由環保署欄位提供，仍應以官方 `last_update_date` 判斷資料更新時間。
- **驗證：** `pnpm test:charging`。

### 消費者委員會油站

- **公開資料來源（消委會）：** [消委會油價資訊通油站頁](https://oil-price.consumer.org.hk/tc/station)。消委會不是政府部門；目前以其公開 HTML 頁面解析，並非本專案使用的穩定 JSON API。
- **更新位置／輸出：** `lib/nearby-facilities.mjs` 的 `parseFuelStations()`；`server.mjs` 的 `/api/fuel-stations`；Pages 快照 `public/pages-data/fuel-stations.json`。全量快照用 `pnpm build:pages`。
- **精度／風險：** 座標從 HTML 的 `destination=緯度,經度` 讀取。HTML 標記改版可能令解析器失效；失敗時服務端保留舊快取，Pages 建置在既有快照存在時保留舊檔。容器版快取 30 分鐘。
- **驗證：** `pnpm test:nearby-facilities`。

### 金管局 ATM

- **主來源：** [金管局 ATM Open API](https://api.hkma.gov.hk/public/bank-svf-info/banks-atm-locator?lang=tc)。
- **後備來源：** [HKMA ATM ArcGIS 空間查詢](https://services3.arcgis.com/6j1KwZfY2fZrfNMR/arcgis/rest/services/Automated_Teller_Machines_%28ATM%29_of_Retail_Banks_in_Hong_Kong/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson&resultRecordCount=3000)。
- **更新位置／輸出：** `lib/nearby-facilities.mjs`；`server.mjs` 的 `/api/atms`；Pages 快照 `public/pages-data/atms.json`。使用 `pnpm build:pages` 更新靜態資料。服務端快取 30 分鐘；主來源記錄量不足 1,500 時改用 ArcGIS 後備。
- **特殊排除：** `VERIFIED_ATM_EXCLUSIONS` 排除已核實沒有 ATM 的富邦銀行分行地址。改動這份排除清單時，附上銀行官方證據並執行 `pnpm test:atm-crosscheck`。

### 運輸署智能咪錶及路旁感應泊位

- **咪錶來源：** [泊位位置 CSV](https://resource.data.one.gov.hk/td/psiparkingspaces/spaceinfo/parkingspaces.csv) 和[佔用狀態 CSV](https://resource.data.one.gov.hk/td/psiparkingspaces/occupancystatus/occupancystatus.csv)。
- **路旁感應試行來源：** [位置資料](https://data.nmospiot.gov.hk/api/pvds/Download/parkingspace) 及[狀態資料](https://data.nmospiot.gov.hk/api/pvds/Download/occupancystatus)。
- **更新位置／輸出：** `lib/on-street-parking.mjs` 是共用解析器；`src/api/onStreetParking.ts` 是 Pages 模式消費端；`server.mjs` 提供容器 API。Pages 的 `public/pages-data/on-street-parking.json` **只含非咪錶感應快照**，咪錶位置和狀態在 Pages 前端直接讀取 CSV。
- **新鮮度／限制：** 容器版 60 秒快取；Pages 的感應試行資料在建置時快照化。狀態表與位置表要用泊位 ID 配對；未知狀態不能顯示成空位。驗證用 `pnpm test:on-street`。

### 香港出行易電單車路邊泊位

- **官方來源：** [香港出行易 WFS 電單車圖層](https://www.hkemobility.gov.hk/api/drss/layer/map/?typeName=DRSS%3AVW_ON_STREET_PARKING&service=WFS&version=1.0.0&request=GetFeature&outputFormat=application%2Fjson&srsName=EPSG%3A4326&CQL_FILTER=VEHICLE_TYPE%20%3D%20%27Motor%20Cycles%27)。
- **更新位置／輸出：** `lib/motorcycle-roadside.mjs`；`pnpm build:pages` 更新 `public/pages-data/motorcycle-roadside.json`，讀取器在 `src/hooks/useMotorcycleRoadside.ts`。
- **精度／狀態：** 原始資料是多個點，但程式按街道合併，marker 用該組座標的算術平均值，**不是每個實際泊位的座標**。目前不提供即時空位數；記錄狀態為不可用，顯示的 `total` 是來源點數。不可把組中心說成精確泊位。
- **驗證：** `pnpm test:motorcycle-roadside` 及 `pnpm test:motorcycle`。

### Google Maps 評分、相片及地點連結（第三方）

- **供應者：** Places Text Search 與 Place Photo 由 `server.mjs` 經 Manus Maps proxy 呼叫；代理前綴為 `${MANUS_API_URL}/v1/maps/proxy/`，實際服務主機和金鑰由執行環境提供，不要寫入本文件或 Git。
- **更新位置：** `server.mjs` 的 `/api/place-rating`、`/api/place-photo`、`/api/place-photo/image`；`src/hooks/usePlacePhoto.ts` 為前端讀取器。評分快照產生器是 `scripts/build-verified-place-links.mjs`；需先在有 Maps 服務設定的環境啟動 `pnpm dev`，再執行 `node scripts/build-verified-place-links.mjs`。它輸出 `public/pages-data/verified-place-links.json`。檢查命令為 `pnpm test:verified-place-links`。
- **精度／限制：** 評分結果要求與官方停車場座標相距不超過 100 米且有評論；相片一般地點最多 250 米，洗手間最多 100 米，並會核對結果名稱。評分及評論是 Google 用戶資料，不是政府評級。Pages 靜態版不能即時代理相片，會退回 Google Maps 搜尋連結；容器版才有相片代理。相片影像不由評分快照保存。

### 銀行及油站品牌圖示

- **網域清單：** `src/data/brand-icons.json` 對應銀行／油站名稱、官方網域及圖示 ID；圖示使用 Google S2 favicon 服務，部分項目設定直接圖片網址。
- **更新位置／輸出：** `scripts/refresh-brand-icons.mjs`；執行 `pnpm refresh:brand-icons`，寫入 `public/brand-icons/*.png` 和 `public/brand-icons/manifest.json`。前端圖示配對在 `src/domain/brandIcons.ts`。
- **限制：** 這是品牌 favicon 快取，不等於銀行／油站官方提供的專用商標檔。拉取失敗時只有在本地舊圖大於等於 100 bytes 才保留。
- **驗證：** `pnpm test:brand-icons`。

### 地政總署底圖、標籤及署名

- **來源：** [WGS84 底圖 XYZ 瓦片](https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/WGS84/{z}/{x}/{y}.png)、[繁體中文標籤瓦片](https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/label/hk/tc/WGS84/{z}/{x}/{y}.png)、[地政總署署名圖片](https://api.hkmapservice.gov.hk/mapapi/landsdlogo.jpg)及[署名／免責頁](https://api.portal.hkmapservice.gov.hk/disclaimer)。
- **更新位置：** `src/components/MapView.tsx` 的 TileLayer URL、縮放上下限和 attribution。瓦片按瀏覽器地圖範圍即時載入，沒有本地瓦片快照或資料刷新命令。
- **不可移除署名。** 地圖最大顯示縮放 22、來源原生縮放最高 20；調整時執行 `pnpm test:map-zoom-style` 及 `pnpm test:map-markers`。

### 座標與搜尋定位服務

- **政府停車場地址定位：** `lib/gpa-carparks.mjs` 使用上述地政總署位置搜尋與香港測繪處座標轉換服務。這是 GPA 資料轉成 WGS84 的一部分，不是獨立廁所座標來源。
- **使用者目前位置：** 由瀏覽器 Geolocation 提供，不是政府資料集，也沒有固定外部來源 URL；不可把使用者位置寫進公開快照。
- **導航：** 停車場、設施及公廁的路線按座標組成 Google Maps Directions 連結，屬外連導航，不是供應商回傳的資料。

## 已盤點但尚未完整成為地圖來源
民政署已有 110 個場地級灰階 marker；康文署塱原自然生態中心已有一個明確命名的官方洗手間點。尚缺精確位置的項目包括濕地公園六個洗手間、塱原單車徑附近三處臨時廁所，以及仍待逐項核實的港鐵、香港國際機場、西九文化區、海洋公園、房委會和市區重建局等來源。詳見[政府及公營機構公廁來源盤點](2026-10-10-government-public-toilet-source-survey.md)。不得把地址、商場／車站座標、平面圖像素或濕地公園中心點當成廁所精確 marker；如只有官方場地座標，必須明確標示「場地位置，非廁所精確點」。

## 更新後的最小檢查

1. 先看更新命令的完整日誌，確認各快照真的成功更新；檢查來源時間欄位和 `git diff -- public/`，識別只有生成時間變更的檔案。
2. 執行 `pnpm check` 及受影響的來源測試；最後執行 `pnpm test:pages`、`pnpm test:pwa` 和 `git diff --check`。若改動地圖，再執行 `pnpm test:map-markers` 和 `pnpm test:map-zoom-style`。
3. 修改一條來源管線時，同步更新本文件相應段落：官方 URL、程式檔、刷新命令、輸出檔、讀取端、快取／刷新模式、精度限制及對應測試。
4. 不要在此文件、快照或前端程式寫入 API 金鑰或其他秘密。不要因為上游暫時失敗就將舊快照改標為「最新」。
