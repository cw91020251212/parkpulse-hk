

## 漁護署郊野公園公廁來源補充

使用者指出大埔鉛礦坳營地公廁未顯示。既有康文署戶外場地快照無法涵蓋此設施，進一步查核漁護署（AFCD）郊野公園公廁專用資料。官方 CSDI 資料集 ID 為 `afcd_rcd_1635136427551_29173`；官方版本 API 提供季度檔案，2026 Q3 GeoJSON 內有 167 個點位，其中包括：

- 名稱：廁所（鉛礦坳營地）／Toilet (Lead Mine Pass Campsite)
- AFCD 設施 ID：`SM/TF/004`
- 所屬郊野公園：城門郊野公園／Shing Mun Country Park
- 類型：沖水式廁所／Flushing Toilet
- 無障礙設施：官方欄位為 `Y`
- WGS84：經度 `114.1582168747`、緯度 `22.4120975474`

來源：漁護署 [郊野公園廁所資料頁](https://www.afcd.gov.hk/tc_chi/country/cou_vis/cou_vis_rec/cou_toi.html)、[CSDI 資料集頁](https://portal.csdi.gov.hk/csdi-webpage/dataset/afcd_rcd_1635136427551_29173)，季度檔案由 CSDI 官方版本清單連結取得。初步座標比對 167 個 AFCD 點位與現有食環署及康文署快照在 150 米內無重複，後續整合仍會保留通用近距離去重保護。


## 後續全港來源盤點的更正：濕地公園

全港跨部門盤點後，實際檢查已納入 Pages 的 AFCD/CSDI 郊野公園公廁 GeoJSON（167 個點位），沒有任何「Wetland／濕地」記錄。漁護署現行頁面列出香港濕地公園，園方另指有 6 個暢通易達洗手間；然而 CSDI 另一筆座標只代表公園場地，並非這些廁所的位置。因此，濕地公園**尚未在目前地圖以廁所點位表示**；待取得官方廁所級座標前，不以園區座標補成假精確 pin。完整部門／機構盤點見 [`2026-10-10-government-public-toilet-source-survey.md`](2026-10-10-government-public-toilet-source-survey.md)。
