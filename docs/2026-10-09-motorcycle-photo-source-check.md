# 電單車路邊泊位官方相片來源核對

**核對日期：** 2026-10-09

運輸署的「路邊電單車泊車位分佈」官方頁面只說明可透過香港出行易查閱泊位分佈，沒有提供相片資產或相片下載欄位。香港出行易的官方 WFS 圖層 `DRSS:VW_ON_STREET_PARKING` 在 `VEHICLE_TYPE = 'Motor Cycles'` 篩選下，提供泊位 ID、車種、咪錶標記、街名、營運時間、備註、佔用狀態欄位及 WGS84 座標；實測欄位不含 `photo`、`image`、`picture` 或相片 URL。

因此，ParkPulse HK 現時可以在 App 內展示官方電單車路邊泊位的位置及數量，但**沒有可合法直接顯示的官方現場相片**。不應以同名街道或附近停車場的隨機相片冒充該泊位。若日後採用第三方街景／照片，必須明確標示第三方來源、使用該服務的正式連結或授權方式，並以官方座標限制相片位置，以免誤導用家。

## 官方來源

- [運輸署：路邊電單車泊車位分佈](https://www.td.gov.hk/tc/transport_in_hong_kong/parking/on_street_motorcycle_parking_spaces/index.html)
- [香港出行易 WFS：電單車泊位圖層](https://www.hkemobility.gov.hk/api/drss/layer/map/?typeName=DRSS%3AVW_ON_STREET_PARKING&service=WFS&version=1.0.0&request=GetFeature&outputFormat=application%2Fjson&srsName=EPSG%3A4326&CQL_FILTER=VEHICLE_TYPE%20%3D%20%27Motor%20Cycles%27)
