# 標準定位針標記修改摘要

**日期：** 2026-10-08

## 修改內容

依照使用者提供的參考圖，停車場 marker 已由圓角方形徽章改為標準水滴定位針外形：圓形針頭配合向下尖端。尖端現作為 Leaflet 的錨點，會精確指向停車場官方座標。

標記沒有使用參考圖的紅色或白色圓孔內容；它沿用「泊邊有位」既有狀態色，中央維持顯示即時空位數或「有／滿／關／–」。

## 受影響檔案

- `src/components/MapView.tsx`
- `src/styles.css`
- `plan.md`
- `TODO.md`

## 驗證結果

已通過 `pnpm test:domain`、`pnpm test:charging`、`pnpm test:photos`、`pnpm check` 與 `pnpm build`。Preview 已載入多個不同空位數的水滴定位針，並確認數字顯示及尖端錨點位置正常。
