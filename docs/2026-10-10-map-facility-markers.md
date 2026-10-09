# 設施結果卡與地圖 Marker 修正

**日期：** 2026-10-10

## 根因

`App.tsx` 原本用以下條件傳送周邊設施到 Leaflet：

```ts
startupLocationPending || facilityMode ? [] : activeNearbyResults
```

選擇洗手間、油站、ATM 或路邊位時，`facilityMode` 必然存在，因此即使下方結果卡已有資料，地圖仍收到空陣列；正式站實測在「洗手間」模式有 31 張結果卡，但 Leaflet DOM 只保留搜尋中心 `📍`。

## 修正

改為只在開機定位仍未完成或沒有設施模式時傳送空陣列：

```ts
startupLocationPending || !facilityMode ? [] : activeNearbyResults
```

這會令已選設施模式的地圖與清單共用同一組 2 公里結果。停車場模式仍沿用 `mapParks`，不會與設施 marker 混合。

## 驗證

- 新增 `pnpm test:map-markers`，檢查設施資料閘門與 `MapView` 的 marker 繪製迴圈。
- `pnpm test:map-markers`、`pnpm test:startup-location`、`pnpm check`、`pnpm build` 及 `git diff --check` 通過。
- 瀏覽器本機實測：14 個停車場結果顯示 14 個停車場 marker；洗手間模式顯示 31 張結果卡及 31 個設施 marker；ATM 模式顯示 50 張結果卡及 50 個銀行 marker。
- 保留 LandsD WGS84 地圖、署名、`📍`、2 公里範圍、中文／英文、結果入口、地圖專注模式與既有詳情行為。
