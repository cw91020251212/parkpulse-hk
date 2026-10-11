# 陸路邊境管制站等候時間：官方資料來源

- **入境事務處 DATA.GOV.HK 資料集：** [陸路邊境管制站等候時間](https://data.gov.hk/tc-data/dataset/hk-immd-set28-land-boundary-control-points-waiting-time)。資料說明為各管制站旅客辦理香港一方出入境手續的整體輪候情況概括評估；資料提供機構為入境事務處，更新頻率為每 15 分鐘。
- **香港居民 JSON：** `https://secure1.info.gov.hk/immd/mobileapps/2bb9ae17/data/CPQueueTimeR.json`
- **訪港旅客 JSON：** `https://secure1.info.gov.hk/immd/mobileapps/2bb9ae17/data/CPQueueTimeV.json`
- **官方資料字典：** [Data Dictionary for Land Boundary Control Points Waiting Time](https://www.immd.gov.hk/opendata/hkt/transport/immigration_clearance/data_dictionary_for_land_boundary_control_points_waiting_time.pdf)。每個管制站有 `arrQueue`（入境）及 `depQueue`（出境）兩個整數狀態。

## 官方狀態碼

| 狀態碼 | 香港居民 | 訪港旅客 |
| --- | --- | --- |
| `0` | 正常，一般少於 15 分鐘 | 正常，一般少於 30 分鐘 |
| `1` | 繁忙，一般少於 30 分鐘 | 繁忙，一般少於 45 分鐘 |
| `2` | 非常繁忙，一般 30 分鐘或以上 | 非常繁忙，一般 45 分鐘或以上 |
| `4` | 系統維護中 | 系統維護中 |
| `99` | 非服務時間 | 非服務時間 |

資料字典列出管制站代碼：`HGP` 皇崗、`HYW` 香園圍、`HZM` 港珠澳大橋、`LMC` 落馬洲、`LSC` 落馬洲支線、`LWS` 羅湖、`MKT` 文錦渡、`SBC` 深圳灣、`STK` 沙頭角。網站只會為有官方即時紀錄及已核對官方位置的管制站顯示 marker；不把缺漏代碼或 `99` 解作低輪候時間。

## 位置與更新邊界

- 位置採地政總署 [Location Search API](https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-development-location-search-api) 核對管制站名稱，再以 [Coordinates Transformation API](https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-coordinates-transformation-api) 將 HK1980 Grid 轉為 WGS84，顯示為管制站官方地圖點，不宣稱為入境／出境大堂入口。
- 入境處 JSON 回應沒有瀏覽器可用的 CORS 授權標頭，因此 GitHub Pages 不能在使用者裝置直接每 15 分鐘讀取。網站會在 GitHub Pages 官方資料建置時下載最新官方 JSON、保留官方 `Last-Modified` 和快照產生時間，並在介面明確標為「官方快照／非即時」。
- 入境事務處的 [管制站地點與辦公時間](https://www.immd.gov.hk/hkt/contactus/control_points.html) 只作名稱、一般開放資料及用途的交叉參考；即時等候狀態以入境處兩個 JSON 為準。
