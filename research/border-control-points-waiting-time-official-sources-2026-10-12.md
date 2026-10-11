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

資料字典列出管制站代碼：`HGP` 皇崗、`HYW` 香園圍、`HZM` 港珠澳大橋、`LMC` 落馬洲、`LSC` 落馬洲支線、`LWS` 羅湖、`MKT` 文錦渡、`SBC` 深圳灣、`STK` 沙頭角。網站只會為當次官方快照有紀錄且已核對官方位置的管制站顯示 marker；不把缺漏代碼或 `99` 解作低輪候時間。

## 位置與更新邊界

- 位置採地政總署 [Location Search API](https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-development-location-search-api) 核對管制站名稱，再以 [Coordinates Transformation API](https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-coordinates-transformation-api) 將 HK1980 Grid 轉為 WGS84，顯示為管制站官方地圖點，不宣稱為入境／出境大堂入口。
- 入境處 JSON 回應沒有瀏覽器可用的 CORS 授權標頭，因此 GitHub Pages 不能在使用者裝置直接每 15 分鐘讀取。網站會在 GitHub Pages 官方資料建置時下載最新官方 JSON、保留官方 `Last-Modified` 和快照產生時間，並在介面明確標為「官方快照／非即時」。
- 入境事務處的 [管制站地點與辦公時間](https://www.immd.gov.hk/hkt/contactus/control_points.html) 只作名稱、一般開放資料及用途的交叉參考；即時等候狀態以入境處兩個 JSON 為準。

## 2026-10-12 上游缺站核對

2026-10-12 06:43（香港時間）分別讀取[香港居民 JSON](https://secure1.info.gov.hk/immd/mobileapps/2bb9ae17/data/CPQueueTimeR.json)和[訪港旅客 JSON](https://secure1.info.gov.hk/immd/mobileapps/2bb9ae17/data/CPQueueTimeV.json)，兩者均回應 HTTP 200，`Last-Modified` 均為 `Sun, 11 Oct 2026 22:41:03 GMT`。兩份 payload 的代碼都是 `HGP`、`HYW`、`HZM`、`LSC`、`LWS`、`MKT`、`SBC`、`STK`，即缺少 `LMC`；官方[資料字典](https://www.immd.gov.hk/opendata/hkt/transport/immigration_clearance/data_dictionary_for_land_boundary_control_points_waiting_time.pdf)則把 `LMC` 和 `HGP` 都列為不同站碼，並要求兩者同時存在。

網站依本項目核實的八站清單（含 `LMC`、不含 `HGP`）建置。若任一受支援站碼在居民或訪客 JSON 缺失，產生器必須拒絕生成不完整快照，Pages 流程保留最近一次完整快照，不得把 `HGP` 假裝成 `LMC`。GitHub Actions 執行 [38181167313](https://github.com/cw91020251212/parkpulse-hk/actions/runs/38181167313) 因缺少站碼而安全保留完整快照；目前正式站顯示的 `generatedAt` 為 `2026-10-11T22:23:36.839Z`，不是該次 API 的最新更新時間。待官方 JSON 恢復 `LMC` 後，下一次建置才可重新發布完整八站快照。
