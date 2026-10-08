# 路邊位 marker 白色短提示移除

## 問題

路邊位 marker 點按時會同時執行固定詳情面板與 Leaflet `Popup`。詳細面板關閉後，白色短 Popup 仍留在地圖上，既不提供新的選擇，又會遮擋下一個 marker 或地圖控制項。

## 修正

`MapView` 現在只為洗手間、油站及 ATM 保留原有 Leaflet Popup。路邊位 marker 仍會執行 `onSelectOnStreet` 開啟既有詳情面板，但不再掛載 Popup；關閉詳情即直接回到乾淨地圖。最近查看的粉紅 marker、卡片提示、導航、120 條街上限、長按選點及地政總署署名均未改動。

## 驗證

以 390×844 動態網站實測：路邊模式載入 120 個 marker；點按 marker 後固定詳情面板存在、Leaflet Popup 數量為 0；按詳情關閉後面板不存在、Popup 仍為 0，且最近查看 marker 保留 1 個。`pnpm check`、一般建置、Pages 建置、Pages 檢查、PWA 檢查及 `git diff --check` 全部通過。
