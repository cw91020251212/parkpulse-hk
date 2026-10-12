# 頂部字級與品牌副標題調整

日期：2026-10-12

## 修改

| 項目 | 結果 |
|---|---|
| 模式切換按鈕 | 最小高度由 36px 降至 30px；寬度仍為 140px，按鈕字級仍為 13px。 |
| 品牌副標題 | 繁體中文與英文版均只保留 `PARKPULSE HK`，移除 `HONG KONG PARKING` 及分隔符。 |

## 字級檢查

比對前後提交後，確認近期程式碼只改了模式按鈕高度，沒有改動全站字級。全站縮放由 `textScale` 控制並儲存在使用者目前的瀏覽器 `localStorage`；新偏好預設為 100%，可在齒輪選單查看百分比並用 A−／A+ 調整。程式無法知道使用者裝置原先保存的百分比，因此不會擅自覆寫。

## 驗證

`pnpm run check`、`pnpm run test:vehicle-selection`、`pnpm run build` 均通過；也確認兩種語言字典都不再包含 `HONG KONG PARKING`。
