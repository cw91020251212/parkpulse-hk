# 目前畫面 GPS 定位圖釘修正（2026-10-12）

## 問題

「目前畫面」範圍模式把定位圖釘與 2 公里圓圈放在同一個 `searchScope === 'radius'` 條件內。結果是使用者雖已成功取得瀏覽器 GPS 自我位置，切換到目前畫面後卻看不到定位圖釘。

## 修正

- `App.tsx` 新增 `hasGpsPosition`，只在 `navigator.geolocation.getCurrentPosition` 成功回傳座標時設為 `true`。
- 長按地圖、地區搜尋與其他手動中心選取會清除這個旗標，避免預設中心或手動中心冒充 GPS 自我位置。
- `MapView.tsx` 將圓圈與圖釘拆開：2 公里圓圈只在半徑模式繪製；半徑模式維持原有搜尋中心圖釘；目前畫面模式僅在已成功取得 GPS 時顯示同一枚圖釘。

## 驗證

- `node scripts/check-startup-location.mjs`
- `pnpm run check`
- `pnpm run test:map-viewport`
- `pnpm run test:map-markers`
- `pnpm exec vite build --mode pages`
- 瀏覽器模擬 GPS 成功回報：目前畫面模式得到 `locationPins: 1`、`radiusCircles: 0`。
