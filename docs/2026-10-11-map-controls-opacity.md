# 地圖控制按鈕 50% 透明度

日期：2026-10-11

## 修改內容

為避免地圖控制遮擋底圖資訊，以下控制維持整體 50% 透明：

- 地圖左側 Leaflet 放大／縮小按鈕：`.landsd-map .leaflet-control-zoom a { opacity: .5; }`
- 地圖右側整幅地圖放大／縮小按鈕：`.map-wrap > .map-focus-toggle { opacity: .5; }`

只調整視覺透明度，沒有停用控制或改動點擊範圍；兩組按鈕仍可操作。

## 驗證

- `pnpm test:map-zoom-style`
- `pnpm check`
- `pnpm build`
- `pnpm exec vite build --mode pages`
- `pnpm test:pwa`
- `git diff --check`
