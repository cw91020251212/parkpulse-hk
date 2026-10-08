# 頂部圖示控制修改摘要

**日期：** 2026-10-08

## 修改內容

刷新按鈕已由字型字元 `↻` 改成內嵌 SVG 圓形箭咀，SVG 使用固定 viewBox 與中心 transform origin，確保箭咀與圓形按鈕視覺置中；資料更新時仍沿中心旋轉。

「使用我的位置」已由文字按鈕改為純圖示按鈕。圖示依使用者提供的定位針覆蓋摺疊地圖概念，以內嵌 SVG 表示，避免原圖的白底資產在深色工具列顯得突兀。按鈕保留原有定位行為、hover tooltip 和動態無障礙標籤。

## 受影響檔案

- `src/App.tsx`
- `src/styles.css`
- `plan.md`
- `TODO.md`

## 驗證結果

已通過 `pnpm test:domain`、`pnpm test:charging`、`pnpm test:photos`、`pnpm check` 及 `pnpm build`。375×812 Preview 截圖確認刷新 SVG 位於圓形按鈕正中，旁邊的位置控制只顯示地圖定位圖示，沒有定位文字。
