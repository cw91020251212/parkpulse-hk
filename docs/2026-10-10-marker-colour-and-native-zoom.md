# Marker 色階外框、平面投影與原生圖磚縮放

**日期：** 2026-10-10

水滴 marker 的外框改為按各自底色加深一級的 1px 色階，不再使用近黑色。車場的有位、已滿、關閉和無資料，以及洗手間、場館、油站、ATM、路邊位和電單車路邊位，各自使用較深的同色系外框；白色品牌 marker 使用中性灰色。最近查看只增加粉紅色外圈，保留原本的色階輪廓。

投影重畫為水滴尖端下方的水平半透明橢圓。它使用 `rgb(48 64 71 / 34%)`、不使用 transform、不模糊、不用 filter 或 box-shadow；marker 本體同樣沒有陰影。這是獨立的地面投影，不是沿用手繪參考的斜向形狀。

地政署的 [Topographic Map API](https://portal.csdi.gov.hk/csdi-webpage/apidoc/TopographicMapAPI) 官方只供應 10–20 級底圖圖磚；實測同一位置在 21、22 級回應空內容。地圖現在把兩個 LandsD 圖層的原生範圍設為 10–20，而介面仍可放大至 22 級。超過 20 級時 Leaflet 縮放 20 級圖磚作精確選點及查看 marker，不再向官方索取空白圖磚，所以不會變成白畫面；圖像不會被誤稱為更高的官方地圖細節。

## 驗證

- 官方文件確認地政署 Topographic Map API 只提供 10–20 級；同一香港中心座標的實際下載測試顯示底圖與標籤圖磚在 18–20 級返回 PNG，在 21、22 級均返回 204 空內容。
- 本機地圖按至 22 級後，畫面保留已載入的底圖和標籤；32 張可見圖磚全部成功解碼，請求來源的最高級別仍是 20，縮放按鈕只在 22 級才停用。
- 本機停車場 marker 計算樣式為 `1px solid rgb(4, 102, 94)`、沒有本體陰影；投影是 `rgba(48, 64, 71, 0.34)`、沒有 filter 或 box-shadow。實際 ATM 白色品牌 marker 為 `1px solid rgb(123, 135, 144)`，同樣沒有陰影。
- `pnpm test:map-zoom-style`、`pnpm test:map-markers`、`pnpm test:startup-location`、`pnpm check`、`pnpm build` 及 `git diff --check` 通過。
