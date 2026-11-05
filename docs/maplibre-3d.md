# MapLibre 站內 3D 地圖

本版以 MapLibre GL JS 取代地政總署 3D 新分頁入口。原本 Leaflet／地政總署 2D 地圖繼續保留；工具列同一個「3D」按鈕切換到站內 3D，之後變成「2D」返回平面圖。全画面同樣由既有更多選單切換，不另外加入一套重複入口。停車場／附近設施詳情內「查看此處 3D」同樣回到本站地圖並置中該點。

3D 共用原有官方泊車空位、車種／設施篩選、附近設施標記、2公里／目前畫面範圍和詳情。可旋轉、傾斜、放大；建築圖層在放近至約zoom14.5以上顯示，較遠時先顯示道路地圖。切換記住目前中心和縮放。使用者精確座標不送到新增代理；瀏覽底圖會照一般網絡地圖方式向圖磚供應者請求目前畫面。

MapLibre按需載入。瀏覽器未支援WebGL、根樣式載入失敗或逾時時，返回仍可使用的2D地圖並提示。3D建築由OpenFreeMap向量圖磚中的OpenStreetMap資料繪製，形狀和高度可能不完整或不準確，不能當作實景照片、停車入口或車高證據。地圖控制保留OpenFreeMap／OpenMapTiles／OpenStreetMap歸屬，2D仍保留地政總署歸屬。

Official references: [MapLibre 3D buildings](https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/), [OpenFreeMap](https://openfreemap.org/), [OpenStreetMap copyright](https://www.openstreetmap.org/copyright).

本版先在功能分支驗證，不會自動合併正式main或發佈GitHub Pages。2026-11-03的官方3D文件描述的是已被替換的舊入口，僅保留作歷史記錄。

## 2026-11-05 實测

TypeScript、GitHub Pages打包、PWA、地圖範圍、marker、車種選擇、位置資訊與返回歷史檢查通過。真實 Chromium 實測取得1000個建築source feature、670個畫面3D建築、16個位置／空位marker；地圖下方只保留1個模式切換掣，舊官方3D外連為0。3D切回2D保留15.75小數縮放，中心偏差小於1米。海富marker成功開啟海富停車場詳情；手機390px全畫面可用。受控WebGL context loss成功回退2D並顯示提示，頁面JavaScript錯誤為0。

MapLibre6依官方Vite安裝指南使用`?worker&url`配合`setWorkerUrl()`，Pages打包獨立產出worker檔，避免只有marker而底圖空白。底圖20秒內未取得可用向量feature時回退2D；單一暫時圖磚錯誤不立即回退。3D高度／道路仍依第三方資料完整度，不保證每處都有完整建築。場地洗手間手動拖曳定位仍沿用原2D編輯，不新增3D編輯工具。
