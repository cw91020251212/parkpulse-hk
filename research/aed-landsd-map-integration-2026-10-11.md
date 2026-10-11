# AED 與地政總署公廁資料接入備忘

更新日期：2026-10-11

## AED 急救機

- 正式地圖資料來源：消防處「CARE AED 搵得到」開放資料 API（[data.gov.hk 資料集](https://data.gov.hk/en-data/dataset/hk-fsd-fsd1-fsdaedapi)）。
- 網站用 `https://es.hkfsd.gov.hk/aed_api/export_aed.php?lang=TC` 取得繁中 CSV，僅保留「Whether the AED can be used by anyone = Yes」且座標位於香港範圍內的登記。
- 2026-10-11 檢查的來源 CSV 有 **4,676** 筆紀錄，當中 **4,622** 筆標示可供任何人使用；未標示可供公眾使用的 **53** 筆不會顯示。
- CSV 沒有 `Access-Control-Allow-Origin`，所以 GitHub Pages 不能由使用者手機直接讀取；改為在 Pages 建置時生成 `public/pages-data/aeds.json` 快照，並向用家顯示快照時間。用戶選擇 AED 時才載入該檔案；這不是即時可用性資料。
- 每個 AED 卡片保留官方詳細裝設位置、服務時間、可操作及可接觸對象；實際可用性仍以現場和機構安排為準。
- 地圖標記採用 [ISO 7010 E010](https://commons.wikimedia.org/wiki/File:ISO_7010_E010.svg) 的綠底白色心形閃電符號。使用的 SVG 是 Commons 上以 CC0 發布的重繪檔。

## 地政總署公廁補漏

- 已有 `scripts/audit-lcsd-named-toilets.py`：以地政總署 Location Search 對 **319** 個康文署場地級點逐一核對「精確廁所名稱 + 同一場地 + 同一地區」，再用香港測繪處官方服務轉換 HK Grid 至 WGS84；這條嚴格路徑目前提供 **80** 個具名精確點。
- 新增 `scripts/audit-landsd-map-toilets.py`：以十八區中英文「公廁／廁所／public toilet」查詢地政總署 GeoInfo Map，拒絕含「附近／nearby」等模糊標籤。它會排除與現有精確點相距 20 米內的同點，亦會排除同一正規化名稱、相距 150 米內的點；灰色場地級點不會阻擋新增精確點。2026-10-11 重審從 308 個去重後官方標籤中保留 **9** 個未被現有精確點覆蓋的新增公廁。
- 這個廣域搜尋每個關鍵字最多回傳 50 筆結果，故它是**補漏**而非宣稱完整取代任何主管部門名冊；每個保留點均會附上原查詢及坐標轉換 URL。
