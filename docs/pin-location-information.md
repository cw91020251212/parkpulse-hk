# 紅色位置揿釘資訊

紅色 GPS 或手動搜尋中心揿釘可輕點一次開啟原生 Leaflet 小視窗。資訊只在主動點擊後顯示；關閉叉、點地圖、Escape 或手機返回均沿用既有 Popup 返回管理。3D 連結指向揿釘座標，與拖動後的畫面中心分開；在官方新分頁開啟，保留原頁。

手動選點顯示使用者已選地區名稱。GPS 位置及未核實名稱的點顯示座標，不自行填上最近大廈。位置不是精確門牌承諾，也不表示手動點就是用家身處的位置。本輪沒有新增座標反查請求、影像代理或資料上傳服務。

2026-11-03 核實了官方 GeoAddress Finder 及 Location Search：前者使用的 identify 服務對第三方 Origin 回 403「Invalid CORS request」，不能由 ParkPulse GitHub Pages 前端直接 fetch；後者是文字搜尋，不能冒充座標反查。故本版保留名稱未知後備，不繞過 Origin、不使用 no-cors，也沒有把最近文字搜尋結果誤當準確地址。

官方資料來源：

- [GeoAddress Finder](https://tools.csdi.gov.hk/geoaddressfinder/)
- [Location Search API](https://portal.csdi.gov.hk/csdi-webpage/apidoc/LocationSearchAPI)
- [政府地址查詢服務資料集](https://data.gov.hk/en-data/dataset/hk-dpo-als_01-als)

日後如取得可合法供本網站使用的官方反查服務，應另行註明「附近地址／參考，非 GPS 精確門牌」，只在用家主動要求時查詢，並在查詢前說明座標會交予發布者。此限制不影響坐標、原視野保存與官方3D定位。
