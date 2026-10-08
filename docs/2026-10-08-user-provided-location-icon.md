# 直接使用使用者提供定位圖檔摘要

**日期：** 2026-10-08

## 修改內容

頂部「使用我的位置」控制已移除手繪 SVG，直接使用使用者上傳的 `439902.png`。依使用者明確聲明，該圖檔已獲授權可在本網站使用，並已複製為網站靜態資產 `public/location-control.png`。

按鈕維持純圖示呈現，保留原有瀏覽器定位功能、tooltip 與無障礙標籤。

## 受影響檔案

- `public/location-control.png`
- `src/App.tsx`
- `src/styles.css`
- `plan.md`
- `TODO.md`

## 驗證結果

已通過 `pnpm test:domain`、`pnpm test:charging`、`pnpm test:photos`、`pnpm check` 與 `pnpm build`。375×812 Preview 截圖確認頂部定位控制直接顯示使用者提供的地圖定位圖案。
