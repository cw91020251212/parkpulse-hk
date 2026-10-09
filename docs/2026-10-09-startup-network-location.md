# 開機網絡所在地區搜尋中心（2026-10-09）

## 目標

每次重新開啟 app 時，以手機瀏覽器可得的當時所在地區作為附近搜尋中心；之後由使用者手動決定是否改用地區搜尋、長按地圖或定位按鈕。

## 實作

- `App.tsx` 在每個 mount 只發出一次 `navigator.geolocation.getCurrentPosition`。
- 使用 `enableHighAccuracy: false` 和 `maximumAge: 0`，採用裝置網絡／基站可得的一般所在地區，而非要求持續或高精度 GPS 追蹤。
- 成功時更新本機搜尋中心、原生 `📍`、地圖和 2 公里結果；未授權、逾時或不支援時保留香港中心，其他功能照常可用。
- 不使用 `watchPosition`，所以 app 打開後不會自行移動中心。
- 地區搜尋、長按選點、最近無障礙入口和手動定位都會鎖定使用者選點；尚未回來的啟動定位不會覆蓋它。手動定位仍可明確覆蓋先前中心。
- 精確／一般位置只在瀏覽器記憶體中作搜尋中心，沒有加入 localStorage 或伺服器資料。

## 驗證

- `pnpm test:startup-location`：確認單次 fresh lookup、非高精度模式、沒有 `watchPosition`，以及手動中心保護存在。
- Chrome CDP 以大埔模擬網絡位置確認開機結果標示為「我的位置 · 2 公里」。
- 同一測試延遲啟動定位後立刻選「大埔區」；延遲 callback 返回後仍顯示「大埔區 · 2 公里」，證明不會覆蓋手動選點。
- 已執行 TypeScript、一般／Pages 建置、Pages、PWA 及 diff 檢查。
