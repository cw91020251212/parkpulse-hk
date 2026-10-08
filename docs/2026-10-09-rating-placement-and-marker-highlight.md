# 評分位置與最近查看 marker 視覺修正

日期：2026-10-09

## 問題

停車場卡的 Google Maps 星級評分原本由最後生效的 CSS 放在名稱行，並令整個標題容器預留空間；長名稱因而被不必要地截短。地政總署底圖的道路帶有黃色，最近查看 marker 的黃色邊線不易辨認。

## 修正

- 保留評分為卡片詳情按鈕以外的獨立 Google Maps 連結；不改 React 結構或互動語義。
- 將 `.park-card-rating` 對齊灰色區域／地址資料列的右端（`top: 58px; right: 11px`），不再為整個名稱容器留白。
- 僅讓灰色次要資料列以 `padding-right: 43px` 避開評分；名稱行可使用完整的距離前寬度。
- 將 `.parking-marker.is-last-viewed` 與 `.toilet-marker.is-last-viewed` 的外框由黃色改為桃紅 `#ff3b78`，並保留一像素淺粉 `#ffd0df` 內線。卡片本身的金色最近查看提示維持不變。

## 驗證

- `pnpm check`、`pnpm build`、`pnpm build:pages`、`pnpm test:pages`、`pnpm test:pwa` 及 `git diff --check` 全部通過。
- 以 GitHub Pages 建置輸出在 320×680 模擬手機實測繁中與英文：抽樣的海富停車場、西九龍政府合署、愛民停車場和何文田停車場均確認評分位於名稱下方、與地址同列、沒有與名稱或距離重疊，且連結不在 `button` 內；上述名稱都沒有被截斷。
- 點開後關閉停車場和路邊位詳情，分別只留下 1 個最近查看 marker；兩者的實際計算外框色均為 `rgb(255, 59, 120)`，並含淺粉內線。路邊位模式仍維持 120 個 marker 的渲染上限。
