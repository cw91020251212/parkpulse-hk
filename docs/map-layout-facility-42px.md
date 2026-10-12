# 手機版附近設施地圖高度修正

日期：2026-10-12

## 變更

在 `max-width: 720px` 下，只有附近設施模式的 `.map-column` 比泊車模式多 `42px`。`max-width: 900px` 的現有規則已將 `.workspace` 設為 `height: auto`，因此父層應隨地圖欄內容自然增高；不要再為 `.workspace.is-facility-mode` 設固定高度，否則父層可能裁掉搜尋及圖例控制。

泊車模式高度保持原狀；只有 `.is-facility-mode`（不含專用路邊位模式）增加地圖高度。`App.tsx` 維持不變，版面由 CSS 控制，沒有動態視窗高度計算。

## 維護檢查

`scripts/check-map-viewport-scope.mjs` 斷言手機workspace維持 `height: auto`、地圖欄精確增加 `42px`，且搜尋和圖例控制仍置於地圖欄內。若修改篩選列高度，需同步調整地圖欄規則與此斷言，並以手機尺寸確認地圖底部控制仍完整可見。
