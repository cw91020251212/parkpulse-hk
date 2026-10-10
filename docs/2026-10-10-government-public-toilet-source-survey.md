# 香港政府及公營機構公廁資料來源盤點

## 哪些部門有公眾可用廁所資料

香港政府 2025 年立法會答覆確認，食環署、康文署、漁護署及民政事務總署都會管理其管轄範圍內供公眾使用的廁所；另有公營機構受委託營運部分公廁。[1] 泊邊度現已接入食環署公廁、康文署室內及戶外場地公廁，以及漁護署郊野公園公廁。民政事務總署是這四個部門中尚未接入的部門。

民政事務總署有社區會堂／社區中心名單，另有無障礙設施 CSV。兩份官方資料以地區和地址識別場地；交叉核對後，110 個會堂／中心名單記錄標示設有暢通易達洗手間。[2] [3] 這不是完整的男／女／通用廁所清單，也沒有經緯度；而且會堂可能需要預約或受開放時間限制。因此，現階段不能把地址或會堂位置冒充成廁所的精確地圖點。

## 其他公營機構的官方資料

這些來源有實際公廁資訊，但大多欠缺可以直接放到香港地圖上的廁所座標：

- **港鐵：** 官方資料可找出 8 個設有非付費區暢通易達洗手間的車站；其中羅湖及落馬洲屬邊境管制站，不宜當作一般市區公廁。CSV 沒有座標，官方網頁只提供車站內文字位置和 PDF 車站圖。[4] [5] [6]
- **香港國際機場：** 官方互動地圖列出非限制區廁所。篩選後有 27 條明確位於登機大堂、入境大堂或地面交通區的資料，但含男女及無障礙設施的重複位置。資料沒有經緯度，且地圖底層接口不是承諾穩定的開放資料 API。[7] [8]
- **西九文化區：** 藝術公園官方無障礙指南列出 5 個公廁位置，場地免費開放，通常為 06:00–23:00；M+ 樓層圖亦標出廁所。這些都是示意平面圖和文字位置，沒有 WGS84 座標；M+、Freespace 等場地另有入場或活動時間限制。[14] [15] [16]
- **海洋公園：** 官方園區地圖資料含 19 個不同的廁所位置，但座標只是園區地圖像素，並非香港經緯度。另有校準參考點，卻沒有把每個廁所與地理座標正式連結；不應自行反算後宣稱是官方廁所座標。[18] [19]
- **香港房屋委員會：** 官方資料可定位 56 個屋邨商場，但並非廁所目錄。招標文件只直接證明部分指定商場有公眾廁所，例如蘇屋、啟田、安泰、欣安及博康；商場座標不是廁所座標。[12] [13]
- **市區重建局／裕民坊：** 官方資料證實裕民坊商場有暢通易達洗手間，並有連接公共交通交匯處的 24 小時公眾通道；這不代表廁所本身 24 小時開放，也沒有精確廁所位置。[17]

這些機構不是新增的政府部門。若日後要加入，應用「場館內有廁所／場站內有廁所」的場地級資料類別，清楚標示入場限制及位置精度；不要混入精確公廁點位或計作獨立街道公廁。

## 已發現但目前地圖未能精確落點的缺口

**香港濕地公園需要特別更正。** 漁護署現行郊野公園公廁頁列有香港濕地公園，園方確認有 6 個暢通易達洗手間，並說明現場以清晰符號指出位置。[9] [10] 官方園區地圖亦以設施圖示作導引，但它是示意圖，沒有 WGS84 座標、地理校準或可下載的個別廁所點位資料。[20] 本專案現有 AFCD/CSDI 廁所快照的 167 個點位中沒有濕地公園記錄；CSDI 另有的官方座標只是濕地公園場地位置，不是六個洗手間的座標。[11] 因此，先前所稱「已由 AFCD 快照涵蓋」不正確。找到廁所級官方座標前，不應把園區中心點或從示意圖估算的位置當成廁所 marker。

園方官方聯絡頁列有一般查詢信箱 `info@wetlandpark.gov.hk` 及電話 `(852) 3152 2666`，可向園方索取六個洗手間的正式座標或有座標的場地圖。[21] 本輪未能取得座標，也未有代發查詢。

在目前查到的官方資料中，沒有找到民政事務總署、港鐵、機場、西九或房委會可直接提供個別廁所 WGS84 位置的完整資料集。政府產業署、醫院管理局、香港科技園及數碼港亦未找到足以證明其一般公眾廁所位置的官方機器可讀資料；這表示本輪不能核實，不表示那些地方一定沒有廁所。[1]

## 對地圖的建議

要維持「附近 2 公里」結果及導航可信度，精確 marker 只應使用官方廁所座標。對只有地址、商場／車站座標、樓層圖或文字位置的來源，先保留為場地級名錄，待取得官方座標，或在介面清楚區分「場地位置，廁所位置未精確標示」後才加入；不可用估算點偽裝成精確廁所。濕地公園優先向園方索取六個廁所的正式 WGS84 位置。

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
