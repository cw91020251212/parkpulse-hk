# 充電設施資料研究（2026-10-08）

## 已確認根因

- 現行停車場空位整合 API：`https://api.data.gov.hk/v1/carpark-info-vacancy/?data=info&lang=zh_TW`
- 下載後統計，`facilities` 僅有：`evCharger` 18 筆、`disabilities` 15 筆、`unloading` 6 筆。
- 荃灣區「荃灣停車場」（`park_Id: tdcp3`；地址：新界荃灣青山公路－荃灣段 174–208 號）以及同區多個停車場的 `facilities` 為 `null`。
- 因此目前程式以 `facilities.includes('evCharger')` 篩選會正確反映此 API 的 18 筆標記，但**不能反映所有實際有充電器的停車場**；問題是來源資料覆蓋不足，不是前端字串比對錯誤。

## 可補強的官方來源

- 環境保護署「Electric Vehicle Chargers for Public Access」資料集：
  - 資料集頁：<https://data.gov.hk/en-data/dataset/hk-epd-evcpateam-evc-1>
  - 資源頁：<https://data.gov.hk/en-data/dataset/hk-epd-evcpateam-evc-1/resource/2eb2abc9-4fc1-4344-b68e-df2e2c69fc00>
  - 描述：政府及私人機構提供、供公眾使用的充電器位置與詳情。
  - 更新頻率：季度。
  - 資源轉至 CSDI GeoPortal：<https://portal.csdi.gov.hk/geoportal/?datasetId=epd_rcd_1631080339740_69941>。
- Data.gov.hk 的官方頁面未直接輸出機器可讀 API URL；後續需由 CSDI 資源／服務描述取得可用的 GeoJSON/WFS 端點，再以停車場名稱、地址與座標進行保守匹配。

## 使用原則

- 只標示可由官方 EPD 充電資料以名稱／地址或近距離座標合理匹配到的停車場。
- 若只能找到附近、但未能辨認屬於同一停車場的充電器，應顯示「附近充電器」而不是「本停車場有充電」，避免誤導。
