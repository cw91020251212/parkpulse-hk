# 結果卡片文字重疊修正

日期：2026-10-12

## 根因與修正

結果清單的設施卡片主欄使用固定 `36px` 標題列。當標題、地址以較大字級換行時，標題列仍維持固定高度，內容因此壓到下一列設施資料。改為依內容自動增高兩列，並為內容欄加上 `min-width: 0`；卡片同時明確預留右側操作欄寬度，避免長文字伸入按鈕區。

## 驗證

- `pnpm run check`、`pnpm run test:vehicle-selection`、`pnpm run test:place-details`、`pnpm run test:nearby-facilities`、`pnpm run build` 均通過。
- 在 390px 寬的公廁結果欄實測 89 張卡片：標題與資料列沒有相交，資料標籤不碰到操作鈕；抽樣最小垂直間距 8px、標籤與操作欄間距 10px。
