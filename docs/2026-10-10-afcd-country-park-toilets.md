# 漁護署郊野公園公廁：鉛礦坳資料補入

## 根因

原有洗手間資料由食環署公廁名錄及康文署室內／戶外場地補充資料組成，不含漁農自然護理署（AFCD）郊野公園設施圖層，因此鉛礦坳營地的廁所即使屬政府設施，仍不會出現在附近清單或地圖。

## 官方來源與資料

- [CSDI「Toilets in Country Parks」資料集](https://portal.csdi.gov.hk/csdi-webpage/dataset/afcd_rcd_1635136427551_29173)
- CSDI 2026 年第 3 季轉換 GeoJSON（由建置器查詢官方版本索引並下載，不硬編碼下載 URL）
- 快照：`public/pages-data/afcd-country-park-toilets.json`
- 本次官方檔含 167 個香港點位；保留官方設施 ID、公園名稱、中英文設施名稱、沖水類型、暢通易達欄位、座標及資料季度。

鉛礦坳營地廁所的正式記錄為 `SM/TF/004`，中文名稱「廁所 (鉛礦坳營地)」、英文名稱 “Toilet (Lead Mine Pass Campsite)”，所屬城門郊野公園，WGS84 座標 `22.4120975474, 114.1582168747`，標記暢通易達。

## 實作

Pages 資料建置會查詢 CSDI 季度檔案索引，選取最新 GeoJSON ZIP、解壓及解析；資料不足或下載失敗時沿用既有快照。前端將新記錄合併進共用洗手間結果，因此同一筆 2 公里範圍計算同時驅動清單、地圖 marker 和 popup。卡片及地圖標籤明確標示「漁農自然護理署郊野公園公廁／AFCD country park public toilet」，並以近距離且名稱相符的條件與食環署／康文署記錄去重。

新增離線回歸測試鎖定資料欄位、唯一性、鉛礦坳設施 ID 與座標、2 公里附近搜尋所需座標、雙語來源及 UI 資料接線；正式部署前後將記錄建置、PWA 與瀏覽器驗證結果。

## 鉛礦坳附近實測
本機介面以官方座標 `22.4120975474, 114.1582168747` 作長按中心，結果顯示 3 個 2 公里內 AFCD 郊野公園公廁；鉛礦坳營地卡片距中心 10 米，含中文來源、沖水類型及暢通易達資料。地圖同時有 3 個設施 marker 加 1 個中心釘。切換英文後顯示 “Toilet (Lead Mine Pass Campsite)” 與 “AFCD country park public toilet”，仍有相同 4 個 marker。此驗收同時揭露洗手間摘要／範圍及頁尾來源曾漏列 AFCD，因此已補上雙語標示並由回歸測試保護。

## 回歸驗證
已通過 `pnpm test:afcd-country-park-toilets`、`pnpm test:lcsd-park-washrooms`、`pnpm test:washroom-icons`、`pnpm test:map-markers`、`pnpm test:map-zoom-style`、`pnpm test:startup-location`、`pnpm check`、`pnpm build`、`pnpm build:pages`、`pnpm test:pages`、`pnpm test:pwa` 及 `git diff --check`。Pages 建置取得 2026-Q3、167 筆 AFCD 公廁快照；資料更新失敗的既有非本次快照按流程保留。
