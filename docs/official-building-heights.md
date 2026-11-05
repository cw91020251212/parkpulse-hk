# 官方建築輪廓／近似樓高與精細模型試點

## 2026-11-06 改善

原本站內3D使用OpenFreeMap／OSM的`render_height`。缺乏高度的建築可能只有5米，而縮放14.5–15.5的升起插值亦會把樓高暫時壓低。新版仍使用MapLibre及原本同一個3D／2D掣、同一批泊車／設施資料，但三維建築改以地政總署公開Building FSDT輪廓及高度API繪製。移除高度隨縮放升起的插值，不恢復舊外連入口、不新增Google計費。

## 全港官方來源

- 資料集：[Building — Lands Department](https://data.gov.hk/en-data/dataset/hk-landsd-openmap-landsd-building)。
- 公開免金鑰服務：`https://portal.csdi.gov.hk/server/rest/services/common/landsd_rcd_1637211194312_35158/FeatureServer/0/query`。
- `BaseHeight`及`TopHeight`都是香港主水平基準上的近似米制高程（mPD），不是相對樓高，也不是WGS84橢球高度；一般平面地圖顯示`TopHeight - BaseHeight`，基底為0，不把海拔93米當作樓高93米。
- 官方[Building FSDT規格](https://static.csdi.gov.hk/csdi-webpage/download/common/d6f743cf657ea5799ba0789332115198fa313401d05fd85256390f0703d55b3b)，3.3.1.1；[服務schema](https://portal.csdi.gov.hk/server/rest/services/common/landsd_rcd_1637211194312_35158/FeatureServer/0?f=pjson)。

只在3D放近至zoom14時載入目前畫面，350ms穩定後按空間範圍查詢並分頁。移動、縮放、切回2D會取消舊請求；保留小型記憶體快取。極密集画面安全上限會標明「資料未齊，請放近」，不能把截斷結果冒充完整全港模型。缺樓高不猜5米、零缺值不轉為有效高程；只保留平面底圖及缺資料提示。官方資料API失敗可重試，不影響原2D或泊車詳情。

**這仍是近似輪廓擠出模型，不是全部建築的精細屋頂或實景影像。** 同一輪廓若涵蓋高座與平台，不應統一升到塔樓高度後聲稱形狀真實。一般建築目前不提供地形海拔、入口或室內樓層的精確重建；數據更新和測量精度依來源，不保證每幢樓都有完整高度。

## 新界南警察總部精細模型

官方Building API的`OBJECTID=216947`、`GeoRefNo=3070125771`、`BuildingCSUID=3070125771T20050726`為新界南總區警察總部。該輪廓`BaseHeight=11`、`TopHeight=93`，差值82米；它涵蓋建築複合體，不能以82米統一取代較低平台。

因此試點另使用官方三維空間數據模型`B307012577101062E0`，保留原有高座、平台、屋頂與天線幾何。模型在原資料中有613頂點、381三角面；局部屋頂高度群包含約36米平台與82米塔楼，最高几何約104.095米包含天線等結構，**不是声稱塔樓屋頂高度104米**。用原幾何的統一垂直平移把最低頂點對齊平面底圖，保留相對高差；不做精確地形／橢球至mPD測量換算。

精細模型成功載入後才排除同一`OBJECTID`的簡化擠出輪廓，其他樓棟仍保留；模型失敗時顯示官方82米近似輪廓及重試操作，不冒稱精細模型成功。37KB小型靜態資產只在附近3D畫面按需載入，正式網站不使用或暴露官方API示範金鑰。`data/official-3d/nts-police.b3dm`為保留的官方原始小模型，`scripts/build-official-3d-mesh.py`可離線重建資產；輸出保留來源、取得日期、原始幾何高度範圍與轉換說明。資料提供者未附此原始模型更新日期，因此不聲稱2026年重新測量。

官方[3D Spatial Data API說明及免費重製條款](https://portal.csdi.gov.hk/csdi-webpage/apidoc/3d-spatial-data-api)允許下載、重製與分發，須注明政府及網站來源與知識產權。官方公開示例僅供本次限定模型查證下載，未放進程式或用於正式runtime。若日後改用全港3D Tiles串流，須向`3dmap@landsd.gov.hk`取得網站自己的免費API金鑰，不把示例金鑰當正式服務。

## 歸屬與限制

建築資料：© HKSAR Government, Lands Department — CSDI Portal；[CSDI使用條款](https://portal.csdi.gov.hk/csdi-webpage/doc/TNC)。政府保留知識產權，資料不是CC0；免費商用／非商用須遵從條款及保留歸屬。底圖仍顯示OpenFreeMap／OpenMapTiles／OSM歸屬，2D保留地政總署歸屬。政府資料as-is／as-available，無準確、完整或時效保證。瀏覽3D向CSDI發送目前畫面邊界，不保存使用者精確GPS，不下載Google建築幾何或樓高。

## 已完成實測（部署前）

Chromium正式網頁環境實測：警總官方欄位11／93mPD，相對82米；画面內825個官方擠出輪廓及單獨精細模型，模型成功後對OBJECTID216947精確排除重複簡化擠出。17.3小數zoom與中心往返2D保留；海富marker成功開啟海富停車場詳情；390×844手機全畫面模型可見且canvas寬390px；頁面仍只有1個切換掣、舊地政3D外連0。受控官方API503保留底圖及重試提示、未改用OSM5米；受控WebGLcontextlost回退2D。頁面JavaScript例外0；開發模式另有既有manifest解析提示，Pages建置manifest及PWA檢查通過。

型別、官方資料數值／缺漏／分頁／截斷／錯誤／取消／15秒timeout檢查、3D、視野、marker、screen navigation、位置資訊、Pages/PWA與Git diff檢查均通過。獨立只讀程式審查未發現具體缺陷。當前僅標示預覽實測成功；正式上線待GitHub Actions確認後追加記錄，不把預覽當發布。

## 正式發布與線上核對

2026-11-06功能版本`6f4eebfd00fb67ef80369e92c3e202eb7714f292`由[GitHub Pages workflow 42076015716](https://github.com/cw91020251212/parkpulse-hk/actions/runs/42076015716)成功建立與部署。隨後直接於[正式網站](https://cw91020251212.github.io/parkpulse-hk/)390px手機畫面核對：精細模型資產HTTP200，官方source為`parkpulse-official-buildings`，樓高公式為`get(height)`，警總欄位11／93mPD及相對82米、精細custom model均存在；1個切換掣、0舊3D外連、頁面JS例外0。缺樓高如實提示，不聲稱全港精細實景模型。
