# 停車場評分資料研究

研究日期：2026-10-09

## 可用來源：Google Maps 用戶評分

香港政府停車場空置資料沒有用戶評分欄位。可用且能清楚標示來源的選項是 Google Maps / Google Places 的群眾用戶評分。

Google 的官方 Places 文件說明 Place Details 回應可提供用戶評分與評論；`rating` 與 `userRatingCount` 為 Enterprise 欄位：

- https://developers.google.com/maps/documentation/places/web-service/place-details
- https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places

本專案已使用受管 Google Maps Places 代理，並以官方停車場名稱、地址與座標配對位置。因此評分實作可重用同一個保守配對原則：只有 Google Maps 候選點與官方車場座標相距不超過 100 米，才顯示評分。

## 呈現原則

- 標示為 `Google Maps 用戶評分`，不是政府／本網站評分。
- 同時顯示 `4.3 / 5 · 126 個評分`；沒有可靠對應、沒有分數或沒有評分人數時不顯示。
- 按卡片進入詳情時顯示相同來源標籤與直接 Google Maps 連結。
- 不自行平均、改寫、排序或抽取評論文字，避免把少量／過時評分包裝成客觀品質指標。
- GitHub Pages 採已核實 Place ID 快照，所以需在快照產生時記錄分數、人數、Google Maps 連結與生成時間；快照沒有更新前不宣稱分數即時。

## 推薦做法

把評分當作停車場卡片的補充資訊，而不是主要排序。主要排序仍是官方實時空位、資料新鮮度及距離。使用者可快速辨認高評分場地，但不能因高分而掩蓋沒位、關閉或收費等實際條件。
