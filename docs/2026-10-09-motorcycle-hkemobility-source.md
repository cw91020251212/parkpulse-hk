# 香港出行易電單車路邊泊位官方來源

**研究日期：** 2026-10-09
**資料擁有人：** 香港特別行政區政府運輸署／香港出行易

## 更正

先前只核對智能咪錶及路旁感應試行資料，兩者的 `VehicleType` 並不包括電單車；這不代表香港沒有官方電單車路邊泊位資料。運輸署的[路邊電單車泊車位說明](https://www.td.gov.hk/tc/transport_in_hong_kong/parking/on_street_motorcycle_parking_spaces/index.html)明確引導使用香港出行易的地圖資訊。

## 可重用的官方位置／數量圖層

香港出行易官方 WFS 圖層：

- 端點：[DRSS:VW_ON_STREET_PARKING](https://www.hkemobility.gov.hk/api/drss/layer/map/?typeName=DRSS%3AVW_ON_STREET_PARKING&service=WFS&version=1.0.0&request=GetFeature&outputFormat=application%2Fjson&srsName=EPSG%3A4326&CQL_FILTER=VEHICLE_TYPE%20%3D%20%27Motor%20Cycles%27)
- 圖層類型：`DRSS:VW_ON_STREET_PARKING`
- 電單車篩選：`VEHICLE_TYPE = 'Motor Cycles'`
- 2026-10-09 實測：`numberMatched = 13,068`、`numberReturned = 13,068`；按中英文街名合併後為 **667** 組。
- 欄位包括 `PARKING_SPACE_ID`、`VEHICLE_TYPE`、`METER`、中英文街名、營運時間、備註及 WGS84 點座標。範例：南寧街的 `100100`、`100101` 均為 `Motor Cycles`。

## 呈現限制

這個圖層提供**官方位置及數量**，不保證電單車即時空位。本站會在建置時保存街道群組快照、以 2 公里及 120 組上限呈現，並在 marker、卡片、詳情及來源提示清楚標為「沒有即時空位」。不會將零值、私家車咪錶狀態或推算結果包裝為電單車空位。

## 站內實作

- `lib/motorcycle-roadside.mjs` 只請求上述官方 WFS 的 `Motor Cycles` 圖層，按中英文街名、營運時間、咪錶標記及位置群組；不混入智能咪錶／感應試行的即時資料。
- `public/pages-data/motorcycle-roadside.json` 是 GitHub Pages 建置時更新的官方快照；`build-pages-data.mjs` 以 60 秒逾時保留上一份可用快照，避免一次官方網絡失敗令既有資料消失。
- 電單車模式按下「電單車路邊位」會**留在 App 內**，在目前 2 公里範圍顯示官方水滴、街道卡片與詳情；資料只寫「官方位置及數量，沒有即時空位」，不再把使用者送往外站。
- 水滴與卡片以藍色路邊位樣式呈現總數；詳情顯示官方來源連結、街道／營運資料及導航，但不顯示「有位／已滿」或推算收費。

## 驗證

- 2026-10-09 快照：13,068 個官方電單車泊位，667 個街道群組。
- `pnpm test:motorcycle-roadside` 檢查快照、`Motor Cycles` 車種、街道群組、中英文名稱、WGS84 座標、來源 URL 及靜態限制。
- `pnpm test:pages` 檢查 Pages 輸出含有此快照；`pnpm check`、一般／Pages 建置、PWA 檢查與 `git diff --check` 通過。
- 390px 手機互動實測：預設搜尋中心有 93 個官方電單車泊位街道卡片與 93 個藍色水滴；繁中提示「沒有即時空位」。英文詳情顯示 `FA YUEN STREET`、同一靜態提示及香港出行易官方來源連結。
