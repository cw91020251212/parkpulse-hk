# 政府實景3D混合地圖

正常開啟維持原Leaflet 2D地圖。原本標示「3D」的同一按鈕才開啟Cesium實景版；3D時按鈕標示「2D」，可隨時切回。原有泊車及設施資料、空位、篩選和詳情直接共用，不另造一份標記資料。地政總署實景模型做底，ParkPulse原有HTML圖標疊在場景上。

## 模型與引擎

實景來源是地政總署官方[3D Visualisation Map — Tile-based Models](https://data.gov.hk/en-data/dataset/hk-landsd-openmap-3d-visualisation-map-tile-based-models)，由傾斜航空影像重建的有貼圖模型。官方資料集說明覆蓋全港，不是之前單幢警察總部試點，也不是把OSM或建築輪廓按預設數字拉高。

目前使用官方API文件所列的3D Tiles來源：`https://data.map.gov.hk/api/3d-data/3dtiles/f2/tileset.json`。2026-11-06已實際無金鑰讀取根索引、兩級子索引及一份完整140,350位元組b3dm；該檔含glTF 2.0及KTX2材質。未取用Open3Dhk網站內部憑證。官方模型API文件另有免費APIkey申請說明，程式保留網站自身服務設定位置。

Cesium固定1.147.0，以按需載入、版本化獨立SDK及workers部署到`vendor/cesium/1.147.0/`，使用Vite `BASE_URL`支援GitHub Pages子路徑。預設2D不載入SDK，不使用Cesium ion或ion key。SDK是建置產物、不提交到Git；建置時由固定依賴準備，保留Apache2.0及第三方授權資訊。

## 漸進細節與互動

初始屏幕誤差16快速顯示模型。首個可用模型後500ms進中間級別，1250ms自動要求細節級別（一般裝置8→4，較受限裝置12→8），不要求手動再放近，也不等遠處中間層全部完成才加清眼前區域。模型完成判斷以實際渲染後`tilesLoaded`為準，快取已有模型不依賴新下載事件；有未完成細節時由`postUpdate`最多10Hz安排新渲染幀，完成後停止。GPU模型快取一般256MiB、較受限裝置128MiB，另有同額度overflow上限；這是場景期間的記憶體快取，不是離線下載全港模型。

DOM圖標沿用原HTML、尺寸、選取外框及點擊回呼。保留GPS／手動中心釘、2公里範圍圈、目前畫面篩選、長按選中心、原詳情和popup返回操作、全畫面及手機版。一般畫面用原3D／2D掣，全畫面用右上角「⋯」選單內同一切換。Leaflet地面比例以256px圖磚換算3D距離，保留小數縮放；擷取中心及聚焦以數學WGS84橢球地面為基準，不依賴逐步細化的地球三角網格或大廈屋頂，避免載入期間漂移。

SDK、根資料或GPU錯誤返回可用2D。根索引成功但首個模型內容一直失敗亦有45秒限時回退；已有可用粗模型後，個別細節檔失敗不會丟棄整個場景。模式切換會清理viewer、模型、DOM標記、GPU、事件與計時器；穩定完成狀態不反覆觸發渲染。

## 設定與驗證

GitHub Actions可選`LANDSD_3D_URL` repository variable與`LANDSD_3D_API_KEY` repository secret，分別注入`VITE_LANDSD_3D_URL`及`VITE_LANDSD_3D_API_KEY`；未設定則使用上述已驗證公開來源。瀏覽器模型APIkey會出現在對供應者的請求中；GitHub secret只防止寫入Git，不把瀏覽器服務key變成不可見後端密鑰。

執行`pnpm test:photoreal-3d`驗證相同地面比例、無新下載事件的自動高清、快取上限、不空轉、根／內容失敗及取消清理；`pnpm test:official-3d`保留同一按鈕、2D與原共用回呼及舊書籤遷移檢查。正式Pages由原`pnpm build:pages`及原workflow建置發布。實際瀏覽器及部署驗證結果於完成後記錄。

模型源的資料时间、遮挡及重建精度由供應者決定；前端沒有逐幢人工改高或從模型外觀推定停車入口／車高限制。

## 2026-11-06實際驗收

正常開啟是2D，未載入Cesium SDK。政府警察總部固定視野自動提升細節已完成，沒有再次放近。全畫面「⋯」選單3D→2D及小數縮放／中心往返已通過；精確WGS84地面捕捉修正了初始地球網格造成的漂移。

佐敦實測已從原泊車圖標開啟「九龍公園」詳情並關閉；圖標顯示1個空位，資料與原網站共用。真實長按完成手動中心選擇。1280px桌面及390×844px手機全畫面均顯示實景模型和11個泊車標記；桌面細節目標SSE4，模型記憶體57,520,540 bytes。受控WebGL失效返回可用Leaflet 2D；JavaScript例外0。

型別、實景載入、模式切換、地圖範圍、設施標記、屏幕返回、車種選擇、啟動定位、Pages及PWA標準回歸已通過。模型採可見範圍串流，載入新範圍期間仍會繼續精細化。
