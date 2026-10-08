# 停車場收費資料研究（2026-10-09）

## 運輸署整合 API 實際覆蓋

來源：`https://api.data.gov.hk/v1/carpark-info-vacancy/?data=info&lang=zh_TW` ，資料集頁為 `https://data.gov.hk/tc-data/dataset/hk-dpo-datagovhk1-carpark-info-vacancy` 。

資料集的說明聲稱基本資料包含泊車費用，但即時實測 584 個停車場中，只有 27 個 `privateCar.hourlyCharges` 含數字 `price`。其他車種覆蓋更低。專案內的靜態快照有 583 個停車場，其中只有 26 個私家車時租記錄。這是使用者看見大部分「基本時租 未提供」的直接原因，而不是前端只漏顯示已有資料。

`hourlyCharges` 是可用的官方結構化價格來源；可有多個時段。`space` 是總容量，與收費無關。

## 官方補充來源

運輸署「運輸署營運的政府停車場」頁：
`https://www.td.gov.hk/tc/transport_in_hong_kong/parking/carparks/gov_car_parks_managed_by_td/index.html`

頁面以表格列出約十個由運輸署營運的政府停車場的車位數、日間／夜間私家車或客貨車時租、電單車收費及部分日泊／夜泊收費 。它可以作為官方補充，但只覆蓋該小部分政府場，不可當作全港價格來源。

## 營辦商網站覆蓋與限制

官方停車場基本資料有 583 個記錄；258 個記錄含 `website`，共 55 個主網域。其中 144 個是 Link 領展 `www.linkhk.com`，另有 Wilson、MTR、機場、西九、房屋署等不同營辦商。

Link 的個別停車場網址（例如 `https://www.linkhk.com/tc/park1`

`ing/8428` ）是公開頁，但 HTML 只載入空容器，收費由 JavaScript 讀取。其 `js/config/environments.js` 指定公開前端 API 前綴 `/linkweb/api/`；在未確認精確端點、結構、條款與名稱／座標匹配前，不應大量抓取或把價格帶入產品。

## 開源交叉核對

GitHub `scmlewis/ParkingHK` 的 `api/parking/all.ts` 同樣只讀取官方 `privateCar.hourlyCharges`。它對缺少官方價格的停車場按港島／九龍／新界硬填估算時薪（32／28／22）；此做法已明確排除，因它會違反本專案「不虛構資料」原則。

## 建議

保留官方 API 時租為第一優先。可在下一階段為具清晰、公開、官方／營辦商來源的群組（先從運輸署管理的政府停車場及 Link）新增「來源、最後核實、完整時段」資料；對其餘場只顯示官方未提供及既有營辦商網站連結，絕不以空位、地區平均值或未核實第三方價格替代。
