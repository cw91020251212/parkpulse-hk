# 食環署公廁位置資料研究

- **資料提供者：** 食物環境衞生署（FEHD）
- **DATA.GOV.HK 資源頁：** https://data.gov.hk/tc-data/dataset/hk-fehd-fehdlocatn-fehd-facility-and-service-locations/resource/c7f68907-e20d-447e-9618-e9072d465c6b
- **官方繁體中文 XML：** https://www.fehd.gov.hk/tc_chi/map/fehd_map_c.xml
- **資料描述：** 2026-03-03 更新的食環署設施及服務地理位置資料，涵蓋公廁、垃圾收集站、街市等；每筆包括地區、設施類型、名稱、地址、開放時間、座標及備註。
- **公廁識別：** XML 的 `<map_type>` 等於 `toilet`；2026-10-08 實測共有 812 筆公廁資料。
- **主要欄位：** `mapID`、`districtID`、`name_c`、`address_c`、`openHr_c`、`map_coordinate`（緯度,經度）、`updateDate`、`remarks_c`。
- **連線限制：** 2026-10-08 的 XML 回應沒有 `Access-Control-Allow-Origin`，因此不能由瀏覽器直接跨域讀取；應由本站既有 Express 伺服器同源代理並快取。
- **範例：** 香港中心 2 公里內包括奶路臣街、旺角道、砵蘭街及洗衣街花園等公廁，資料含 24 小時開放時間及備註。
