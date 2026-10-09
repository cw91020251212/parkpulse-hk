# ParkPulse HK PWA 電單車支援範圍審核

- **審核日期：** 2026-10-09
- **範圍：** 繁中／英文、PWA 快取、GitHub Pages 靜態資料流程、周邊設施與電單車模式文案／資料流程。
- **方法：** 只讀取指定檔及其直接相關的 API、型別、domain 和 UI 呼叫路徑；未修改任何產品程式或既有文件。外部事實只採用官方來源，並在下文附 URL。

## 結論摘要

電單車已列為一種車種；停車場基本資料、空位、總車位及部分費率在資料模型中可按 `motorCycle` 取用，繁中／英文車種名稱亦已提供。但這**不等於**所有顯示的周邊泊位均適用電單車：路旁結果沒有按目前車種篩選，且 smart-meter 資料欄位 `vehicleType` 雖被解析，卻未在呈現流程使用。另一方面，周邊設施本身是按地點／類別搜尋，並非按車種判斷可否進入或使用。

最明確的語言缺陷是英文介面將空位狀態標籤輸出為硬編碼繁中；靜態 Pages 的基本停車場資訊建置時固定以 `zh_TW` 請求，因此英文介面不會把來源名稱／地址自動翻譯成英文。PWA 對靜態資料採 network-first、離線退回快取，但退回資料沒有在 UI 明確標記為離線舊快照；一般快取優先資源則在同一 SW 版本下不會主動更新。

## 現況與流程證據

### 1. 車種及繁中／英文

- `src/types.ts` 定義 `VehicleType` 包含 `motorCycle`，`VEHICLE_LABELS` 有「電單車」；`src/i18n.ts` 的 `vehicleLabel()` 同時輸出「電單車」及 “Motorcycle”。`src/components/Filters.tsx` 將所有車種作為可選按鈕，`App.tsx` 亦將偏好中的車種存於 localStorage。
- `src/App.tsx` 對每個停車場以 `vacancyById.get(id)?.[vehicleType]` 選空位；卡片的費率及總車位亦在 `src/components/ParkCard.tsx` 按目前車種讀取。資料模型有 `motorCycle` 專屬空位／收費欄位。這是實際的車種分流，不是單純標籤。
- **英文狀態標籤缺陷：** `src/domain/carpark.ts` 的 `getVacancyStatus()` 以繁中建立 `status.label`（如「有位」「已滿」「已關閉」「暫無資料」）；`src/i18n.ts` 的 `vacancyLabel()` 在英文只有 `kind === 'count'` 時自行轉譯，其他情況直接回傳 `status.label`。`ParkCard` 使用此函數。因此英文電單車（及其他車種）在 available/full/closed/unknown 狀態會看到繁中標籤；count 情況則顯示 “N spaces”。
- `src/domain/carpark.ts` 中備註收費解析的車種正規式只有繁中詞（電單車等），政府停車場基本資料也以繁中資料載入；若備註只提供其他語言或格式，英文 UI 仍依賴來源文字，不會翻譯它。公開文件不能確認每個營辦商備註是否均有一致格式。
- **靜態 Pages 語言差異：** `scripts/build-pages-data.mjs` 固定以 `lang=zh_TW` 建置 `public/carpark-info.json`；Pages 端 `src/api/carparks.ts` 先讀此靜態檔，只有該檔不可讀時才請求政府 API（同樣固定 `zh_TW`）。所以切換英文只翻譯介面字串，政府來源的停車場名稱、地址及備註仍可能是繁中。這不是「英文完整資料翻譯」。官方 API 支援 `en_US` 及 `zh_TW`，但現有建置沒有產生兩種語言資料。

### 2. PWA 快取與靜態 Pages

- `public/sw.js` 的 `APP_SHELL` 預快取根頁、manifest 及圖示；`CACHE_NAME` 固定為 `parkpulse-hk-shell-v1`。Activate 刪除其他版本快取。
- 對同源 GET，路徑含 `/pages-data/` 或導航請求走 `networkFirst()`；成功網路回應寫入 Cache，網路失敗用 Cache，若無命中則退回 `./`。其他資源走 `cacheFirst()`；有快取就直接回傳，不再請網路更新。API 跨來源請求不由此 worker 攔截。
- 靜態 Pages 的設計可由 `src/api/site.ts`、`src/api/carparks.ts`、`src/api/nearbyFacilities.ts`、`src/api/publicToilets.ts`、`src/api/evChargers.ts` 及 `src/api/onStreetParking.ts` 確認：`MODE === 'pages'` 時使用 `publicAsset('pages-data/...')`／靜態 JSON；附近油站、ATM、廁所、充電資料由 `scripts/build-pages-data.mjs` 預先生成。非 Pages 部署則部分走伺服器 API。
- `build-pages-data.mjs` 對多個資料檔採「下載成功更新，失敗保留現有檔」；非咪錶感應試行資料會加 `generatedAt` 並標成 GitHub Pages 建置快照。若建置抓取失敗而保留舊檔，該流程沒有因失敗而更新檔內資料時間；使用者可能無法從各設施資料本身判斷內容究竟多舊。
- **錯誤期待：** SW network-first 離線回退成功時，消費端只收到 JSON，未見 UI 將其標為「離線／快取資料」。首頁及靜態資料因此可能看似正常更新，實際卻是舊回應。`networkFirst()` 只以 `response.ok` 判定並更新 cache，沒有 freshness metadata。一般 cache-first 資源在同一 SW 版本下不會網路更新，快取版 UI/程式可能留存；更新仰賴部署端更換 worker 版本或快取被清除。此處是策略效果，不代表每次都會遇到舊版。

### 3. 周邊設施與車種關聯

- `NearbyMode` 包括 toilets、fuel、atm、onStreet。`src/hooks/useNearbyFacilities.ts` 只在 fuel／atm 模式抓資料；`App.tsx` 將設施依中心 2 公里、ATM 銀行及數量上限處理。洗手間、油站、ATM 搜尋均不讀取 `vehicleType`。這符合「附近地點」查詢，不代表電單車可進入場地、油站可供應特定燃料，亦不表示設施對電單車有泊位。
- **路旁結果的重要車種限制：** `src/api/onStreetParking.ts` 解析咪錶 CSV 時把 `location.VehicleType` 放入資料；`lib/on-street-parking.mjs` 亦保留 `record.VehicleType`。然而 `src/domain/onStreet.ts` 分組時不保留／判別車種，且 `App.tsx` 的 `nearbyOnStreetRecords`、`groupOnStreetResults()`、`limitOnStreetResults()` 均不參照所選車種。切到電單車模式仍呈現相同咪錶／感應試行資料。此資料可能描述車位或車種類別，但此 app 目前沒有用該欄位作適用性判定；不可據此宣稱顯示結果一定可供電單車停泊。
- 路旁文案中繁中「路邊位」／英文 “On-street” 以及資料來源標示，配合有效空位數字，容易令電單車用戶期待是可用於所選車種的路旁泊位；目前沒有車種適用性說明。`availableOnly` 在路旁模式轉由 `limitOnStreetResults()` 以整條街 `vacant > 0` 篩選，這不表示該街所有位均有空或電單車可用。
- 油站／ATM／廁所結果只以位置和資料分類，不含車種可進入性或停泊資格欄位；目前免責聲明雖稱資料僅供參考，仍宜在電單車情境避免把「附近」誤讀為「可用／可駛入」。

## 電單車相關錯誤期待清單

| 風險 | 現況造成的期待 | 實際可由程式確認的限制 |
|---|---|---|
| 英文空位狀態仍為繁中 | 英文版已完整本地化 | 狀態標籤 fallback 到繁中 `status.label`。 |
| 英文 Pages 停車場資料仍可能繁中 | 切換 EN 後所有內容皆英文 | 建置資料固定 `zh_TW`，資料文字未翻譯。 |
| 路旁結果看似車種專屬 | 選電單車後顯示的咪錶／感應位可供電單車使用 | 車位 `vehicleType` 沒有被消費或篩選；路旁無按車種過濾。 |
| 空位／可用字樣似乎代表到場可停 | 顯示空位即代表可停電單車 | 官方狀態是資料快照／狀態資訊，且本程式未核實現場限制；普通位亦不一定在資料範圍。 |
| 周邊設施可達／可用暗示 | 「附近油站／洗手間／ATM」等同電單車可進入使用 | 只按座標和設施類別，不檢查車種准入、通行或停泊。 |
| 離線仍顯示有效資料 | 正常卡片看起來像即時 | SW network-first 失敗時可靜默退回舊 Cache；介面無離線／舊快取標記。 |

## 最小修正建議（僅建議，未實作）

1. `vacancyLabel()` 依 `VacancyKind` 完整選擇中英文標籤，不以 `status.label` 當英文 fallback；補英文 available/full/closed/unknown 測試。
2. 路旁層至少在消費資料時按車種欄位做有根據的篩選；若官方欄位的代碼／意義或資料完整度不能確認，應先標示「未按車種核實」，不要默認所有結果適用。可考慮保留未知類別但明示未知，而非錯誤排除或宣稱可用。
3. 在路旁及周邊設施模式補一句簡短的車種／准入限制文案（中英對應），清楚說明附近地點不代表可泊車／電單車准入；空位不等於到場保證。
4. Pages 建置可考慮同時生成 `zh_TW`／`en_US` 來源資料並按語言選用；若不做，至少在英文介面明示政府名稱／備註保留來源語言。
5. 對離線回退資料提供可見的快取／最後更新提示，並確認 Pages 資料 JSON 的生成時間能呈現於使用者介面；避免靜默以舊資料充當即時資料。靜態殼層更新則採用有版本化資產或可靠的更新策略，避免只依賴手動改 SW 名稱。

## 官方來源及可確認範圍

- DATA.GOV.HK「Parking Vacancy Data (One-Stop Version)」官方資源說明：API 有 `vehicleTypes` 參數，明列 `motorCycle`；亦明列 `lang` 支援 `en_US`、`zh_TW`，資料包含停車場資訊／空位，更新頻率標示 Real-Time。這確認政府 API 提供車種參數和語言選擇，**不確認**每個停車場均提供電單車資料，也不代表任何車位現時可停。URL: https://data.gov.hk/en-data/dataset/hk-dpo-datagovhk1-carpark-info-vacancy/resource/01752c62-a6b6-4ddc-bf2d-25efccadc143
- 同一 DATA.GOV.HK 資料集入口（繁體中文）：https://data.gov.hk/tc-data/dataset/hk-dpo-datagovhk1-carpark-info-vacancy
- Transport Department 新智能咪錶車位資料與狀態 API 的程式實際端點：`https://resource.data.one.gov.hk/td/psiparkingspaces/spaceinfo/parkingspaces.csv`、`https://resource.data.one.gov.hk/td/psiparkingspaces/occupancystatus/occupancystatus.csv`。本次讀到的程式將 `VehicleType` 傳入模型但不使用。公開資料的車種代碼及涵義、各車位限制如何對應電單車，未能由本次可取得的官方說明確認，故不推定代碼含義。官方資料入口可參考運輸署交通資料： https://data.gov.hk/en-data/dataset/hk-td-psiparkingspaces-parking-spaces
- Hong Kong Transport Department 道路設計手冊 PDF（官方）：https://www.td.gov.hk/filemanager/en/content_5055/V6_08_2026.pdf 。外部檢索摘要指出文件提及路旁電單車泊車／場外停車場，但本次 PDF 擷取返回二進位內容，未能可靠核對完整上下文；本報告不把該摘要當作已核實法規或適用規則。
- MDN Web Docs（PWA 快取策略說明，技術文件，非香港官方泊車資料）：https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching 。說明 network-first 可於網路失敗時回退快取，cache-first 命中後不會自行刷新；本文對 ParkPulse 行為的判讀以 `public/sw.js` 為直接證據。

## 未能由公開資料確認的限制

- 各停車場當日是否接納電單車、實際可用位數是否涵蓋所有電單車位、以及營辦商臨時安排；只能以營辦商／現場資料核實。
- 智能咪錶 `VehicleType` 各代碼的官方定義、對每個咪錶位的法律／操作限制，以及它們是否包含或排除電單車；本次沒有找到可可靠核對的官方資料字典，因此不解讀代碼。
- 路旁感應試行位目前公布的適用車種、泊車條件及資料延遲 SLA；只確認 build 以快照生成資料並標為 snapshot，不能由此推論適用性或最新程度。
- 各油站、廁所、ATM 等設施是否允許電單車進入／停泊及其現場營業狀況；資料集地點資訊不構成准入承諾。
- 不同瀏覽器／平台快取淘汰、更新與離線狀態的實際時點；程式可確認策略，不能保證特定裝置上的呈現時效。
