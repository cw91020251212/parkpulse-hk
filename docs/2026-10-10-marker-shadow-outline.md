# 水滴 Marker 的實色投影與幼深輪廓

**日期：** 2026-10-10

## 視覺調整

所有 Leaflet 水滴形的停車場與設施 marker 現在共用以下外觀：

- marker 本體移除模糊的 `box-shadow`；
- 改為 `1px` 深青灰色 `#0a3341` 外框，清楚勾出水滴輪廓；
- marker shell 的 `::before` 產生灰色半透明地面投影，放在水滴尖端左下方；
- 投影使用 `rgb(69 79 85 / 46%)`，不使用 blur、filter 或 box-shadow，所以邊界較硬，同時保留底圖可見度；
- 綠、紅、灰、琥珀狀態漸變、數字、設施圖示、品牌圖示、最近查看高亮、`📍` 搜尋中心及 Leaflet 點按行為保持不變。
- 最近查看 marker 保留粉紅色 1px `outline`，但本體仍維持深色 1px 輪廓及沒有陰影。

## 驗證

- 本機瀏覽器檢視 13 個停車場 marker 與 119 個路邊位 marker，水滴均有幼深輪廓及方向性半透明投影。
- DevTools 計算樣式確認 marker 本體 `box-shadow: none`、`filter: none`、`border: 1px solid rgb(10, 51, 65)`；投影亦沒有 box-shadow 或 filter。
- `pnpm check`、`pnpm build` 及 `git diff --check` 通過。
