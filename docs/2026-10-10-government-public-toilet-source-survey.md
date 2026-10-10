# 香港政府及公營機構公廁資料來源盤點

## 哪些部門有公眾可用廁所資料

香港政府 2025 年立法會答覆確認，食環署、康文署、漁護署及民政事務總署都會管理其管轄範圍內供公眾使用的廁所；另有公營機構受委託營運部分公廁。[1] 泊邊度已接入食環署、康文署、漁護署資料，並新增民政署場地級洗手間標記；民政署項目代表場地而非廁所精確位置，使用資格仍須由用戶確認。

民政事務總署有社區會堂／社區中心名單，另有無障礙設施 CSV。交叉核對後，110 個場地明列設有暢通易達洗手間。[2] [3] 原始清單只有場地名稱、地址和地區，沒有經緯度；現已按官方英文場地名稱配對地政總署位置搜尋資料，並把場地座標另存為場地級標記。[22] [23] 這不是完整的男／女／通用廁所清單，也不能說明洗手間樓層／房間或公眾能否免預約使用。地圖以灰階虛線標記，卡片明示場地與公眾開放資格未核實，不能冒充精確廁所點。

## 其他公營機構的官方資料

這些來源有實際公廁資訊，但大多欠缺可以直接放到香港地圖上的廁所座標：

- **港鐵：** 官方資料可找出 8 個設有非付費區暢通易達洗手間的車站；其中羅湖及落馬洲屬邊境管制站，不宜當作一般市區公廁。CSV 沒有座標，官方網頁只提供車站內文字位置和 PDF 車站圖。[4] [5] [6]
- **香港國際機場：** 官方互動地圖列出非限制區廁所。篩選後有 27 條明確位於登機大堂、入境大堂或地面交通區的資料，但含男女及無障礙設施的重複位置。資料沒有經緯度，且地圖底層接口不是承諾穩定的開放資料 API。[7] [8]
- **西九文化區：** 藝術公園官方無障礙指南列出 5 個公廁位置，場地免費開放，通常為 06:00–23:00；M+ 樓層圖亦標出廁所。這些都是示意平面圖和文字位置，沒有 WGS84 座標；M+、Freespace 等場地另有入場或活動時間限制。[14] [15] [16]
- **海洋公園：** 官方園區地圖資料含 19 個不同的廁所位置，但座標只是園區地圖像素，並非香港經緯度。另有校準參考點，卻沒有把每個廁所與地理座標正式連結；不應自行反算後宣稱是官方廁所座標。[18] [19]
- **香港房屋委員會：** 官方資料可定位 56 個屋邨商場，但並非廁所目錄。招標文件只直接證明部分指定商場有公眾廁所，例如蘇屋、啟田、安泰、欣安及博康；商場座標不是廁所座標。[12] [13]
- **市區重建局／裕民坊：** 官方資料證實裕民坊商場有暢通易達洗手間，並有連接公共交通交匯處的 24 小時公眾通道；這不代表廁所本身 24 小時開放，也沒有精確廁所位置。[17]

這些機構不是新增的政府部門。民政署場地級資料已用灰階 marker 接入：官方清單交叉核實到 110 個明列暢通易達洗手間的社區場地，涵蓋 18 區；中英文名單以「參考編號＋地區」配對，避免 `KT` 等短碼跨區重複而把觀塘錯配成葵青。這些 marker 不是精確街道公廁；港鐵等來源仍須逐處確認公眾能否免入閘／免預約使用，以及官方座標是否真的對應該設施。

## 已發現但目前地圖未能精確落點的缺口

**香港濕地公園需要特別更正。** 漁護署現行郊野公園公廁頁列有香港濕地公園，園方確認有 6 個暢通易達洗手間，並說明現場以清晰符號指出位置。[9] [10] 官方園區地圖亦以設施圖示作導引，但它是示意圖，沒有 WGS84 座標、地理校準或可下載的個別廁所點位資料。[20] 本專案現有 AFCD/CSDI 廁所快照的 167 個點位中沒有濕地公園記錄；CSDI 另有的官方座標只是濕地公園場地位置，不是六個洗手間的座標。[11] 因此，先前所稱「已由 AFCD 快照涵蓋」不正確。找到廁所級官方座標前，不應把園區中心點或從示意圖估算的位置當成廁所 marker。

園方官方聯絡頁列有一般查詢信箱 `info@wetlandpark.gov.hk` 及電話 `(852) 3152 2666`，可索取六個洗手間的正式座標或有座標的場地圖。[21] 使用者已自行寄出查詢電郵，現等待園方回覆；在取得廁所級點位前，不應把場地中心或示意圖估點加入精確 marker。

目前未找到民政事務總署、港鐵、機場、西九或房委會可直接提供個別廁所 WGS84 座標的完整資料集；民政署場地級 WGS84 點位是由官方場地名錄和地政總署場地搜尋配對而來，不是廁所點。政府產業署、醫院管理局、香港科技園及數碼港亦未找到足以證明其一般公眾廁所位置的官方機器可讀資料；這表示本輪不能核實，不表示那些地方一定沒有廁所。[1]

## 新界單車徑及塱原自然生態中心

政府 2024 年立法會答覆指出，新界單車徑網絡沿途有逾 100 個非臨時公廁，主要由食環署管理；另列出 8 個新設、已開放並交由食環署管理的公廁。答覆亦提到漁護署在塱原自然生態公園近單車徑三處位置設有臨時廁所，但沒有列出三處的逐點名稱或座標。[24]

現有食環署 812 筆官方公廁快照已含多個可辨識的單車徑附近座標點，包括馬料水吐露港公路、科學園路、馬料水海濱、河上鄉單車徑旁，以及荃灣海興路。這些仍是官方廁所點，不需另外放入估算 marker。

塱原訪客中心的官方設施頁明列訪客洗手間和開放時間。[25] 地政總署位置搜尋可找到明確命名的 `Toilet (Long Valley Nature Centre)`，地址為中心地下；HK Grid 轉 WGS84 後為 `22.506623894, 114.108754063`。[23] [26] 此筆是精確訪客中心洗手間點，但不代表政府答覆中近單車徑的另外三處臨時廁所。

AFCD 的 CSDI 資料另提供一個明確命名為「塱原自然生態公園」的園區位置點。現有 WGS84 點為 `22.508721, 114.112952`，只代表公園，**不是三處臨時廁所中的任何一處**。[27] Esri HK 的轉換副本曾作一次性座標核對；其頁面標示 `Custom License`，REST metadata 未提供具體 `licenseInfo`，因此專案已移除該第三方端點作為 Pages 建置／刷新來源。更新座標應改由 CSDI 官方資料集頁提供的最新下載或官方 WFS 核對；CSDI 已公告 Data Query Service 於 2026 年 6 月 30 日停用，並建議轉用 WFS/WMS。[28] [29] [32] 地圖以灰階／虛線場地 marker 表示政府答覆指出的廁所位於公園附近，卡片和 popup 均明示逐點座標、目前開放情況及時間未有確認；距離和導航只到園區位置，不提供洗手間相片。CSDI 條款容許重製與分發，但要求清楚標示政府、CSDI Portal 和相關資料擁有人；洗手間模式頁尾已加上精確署名 `Common Spatial Data Infrastructure (CSDI) Portal` 並連至條款。[30] [31]

## 對地圖的建議

要維持「附近 2 公里」結果及導航可信度，只有明確命名的廁所點才能標成精確廁所 marker。當官方確認某場地／園區附近設有公廁、但只提供場地座標時，可以用灰階場地點表示；必須同時說明距離／導航目的地只是場地，且不能由該點推論廁所就在標記位置。不可由地址、地圖中心或樓層圖像素估算廁所點。塱原三處臨時廁所逐點位置仍未公開；濕地公園六個廁所仍待園方提供正式 WGS84 座標。

## 參考資料

[1]: https://www.info.gov.hk/gia/general/202506/25/P2025062500359p.htm "立法會答覆：政府部門及受委託營運者管理公眾廁所"
[2]: https://www.had.gov.hk/psi/chcc/chsccs_en.csv "民政事務總署社區會堂及社區中心名單 CSV"
[3]: https://www.had.gov.hk/psi/barrier-free-facilities-in-community-halls-community-centres/barrier_free_facilities_in_community_halls_community_centres_en.csv "民政事務總署會堂及中心無障礙設施 CSV"
[4]: https://www.mtr.com.hk/en/customer/services/nearbytoilet.html "港鐵車站廁所位置"
[5]: https://opendata.mtr.com.hk/data/barrier_free_facilities.csv "港鐵無障礙設施資料"
[6]: https://opendata.mtr.com.hk/data/mtr_lines_and_stations.csv "港鐵路線及車站資料"
[7]: https://www.hongkongairport.com/en/passenger-guide/airport-facilities-services/toilet "香港國際機場廁所設施"
[8]: https://hkia-cdn.starbeacon.io/api/web/Ta6unAJJxUamzXtR/en/pois "香港國際機場官方地圖 POI 資料"
[9]: https://www.afcd.gov.hk/tc_chi/country/cou_vis/cou_vis_rec/cou_toi.html "漁護署郊野公園廁所位置資料"
[10]: https://www.wetlandpark.gov.hk/en/exhibition/facilities-barrier-free "香港濕地公園無障礙設施"
[11]: https://portal.csdi.gov.hk/csdi-webpage/dataset/afcd_rcd_1665631682069_81684 "CSDI 香港濕地公園場地位置資料集"
[12]: https://www.housingauthority.gov.hk/datagovhk/shopping-centres.json "房委會商場位置資料"
[13]: https://www.hkha.gov.hk/en/common/pdf/commercial-properties/tender-notices-and-awards/8310e.pdf "房委會啟田商場招標文件"
[14]: https://webmedia.westkowloon.hk/documents/AccessGuide2024_ArtPark_EN_FINAL_tagged.pdf?VersionId=B9cSOdiA6G7pJMt5wtafeXMi0jW697yM "西九文化區藝術公園無障礙指南"
[15]: https://webmedia.mplus.org.hk/documents/202412-mplus-map-en.pdf "M+ 官方場館樓層圖"
[16]: https://webmedia.westkowloon.hk/documents/Freespace-access-guide-202606-EN-tagged.pdf "Freespace 無障礙指南"
[17]: https://www.ura.org.hk/en/news-centre/press-releases/20210401 "市區重建局裕民坊商場無障礙設施資料"
[18]: https://map.oceanpark.com.hk/assets/data/facilities.json "海洋公園官方園區設施地圖資料"
[19]: https://map.oceanpark.com.hk/assets/data/reference_points.json "海洋公園官方地圖參考點資料"
[20]: https://www.wetlandpark.gov.hk/filemanager/photos/public/exhibition/Hong_Kong_Wetland_Park_Map_20230728.jpg "香港濕地公園官方園區示意地圖"
[21]: https://www.wetlandpark.gov.hk/en/contactus "香港濕地公園官方聯絡方式"

[22]: https://www.had.gov.hk/psi/chcc/chsccs_tc.csv "民政事務總署繁體中文社區會堂及中心名單"
[23]: https://www.map.gov.hk/gs/api/v1.0.0/locationSearch "地政總署位置搜尋 API"
[24]: https://www.info.gov.hk/gia/general/202406/12/P2024061200281.htm "立法會答覆：在新界單車徑網絡提供的公廁"
[25]: https://www.lvnp.gov.hk/tc/lvnc.html "塱原自然生態中心訪客設施及開放時間"
[26]: https://www.geodetic.gov.hk/transform/v2/ "香港大地測量轉換服務"
[27]: https://data.gov.hk/tc-data/dataset/hk-afcd-afcdlist-lvnpcsdi "漁護署塱原自然生態公園 CSDI 官方位置資料"
[28]: https://opendata.esrichina.hk/datasets/long-valley-nature-park-in-hong-kong/about "Esri HK 說明其圖層由 AFCD CSDI GML 轉換而來"
[29]: https://services3.arcgis.com/6j1KwZfY2fZrfNMR/arcgis/rest/services/Long_Valley_Nature_Park_in_Hong_Kong/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson "塱原公園場地點的 WGS84 GeoJSON 轉換副本；不是廁所點"
[30]: https://portal.csdi.gov.hk/csdi-webpage/doc/TNC "CSDI Portal 使用條款"
[31]: https://portal.csdi.gov.hk/csdi-webpage/info/FAQ "CSDI Portal 資料署名與最新下載說明"
[32]: https://portal.csdi.gov.hk/csdi-webpage/doc/GeoSpatialServices "CSDI 官方 WFS、WMS 及 ArcGIS REST 服務說明"
