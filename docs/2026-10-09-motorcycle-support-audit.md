# ParkPulse HK PWA 電單車支援綜合審核

**審核日期：** 2026-10-09
**依據：** 七份指定的結構化審核結果及其中列出的程式碼／本地快照驗證證據。本文不把未由該些結果或官方來源支持的事項當成事實。
**目標：** 電單車模式只能顯示已證實適用於 `motorCycle` 的空位、容量及價格；不能因私家車、通用場地或路邊試行資料而製造「可泊／可用／已核實」的印象。

## 結論與最小決策

離街停車場的核心車種資料流程可保留：目前空位、總車位及結構化時租會按目前 `vehicleType` 讀取 `motorCycle`，而非在缺值時改用 `privateCar`。官方一站式 API 亦把 `motorCycle` 列為有效的 `vehicleTypes`，並把基本停車場資料（info）與空位（vacancy）分開提供。來源：<https://data.gov.hk/en-data/dataset/hk-dpo-datagovhk1-carpark-info-vacancy/resource/01752c62-a6b6-4ddc-bf2d-25efccadc143>、<https://api.data.gov.hk/v1/carpark-info-vacancy/>。

但目前有兩個會直接改變使用者決策的高風險路徑，必須先封鎖：

1. **價格跨車種污染：** 電單車沒有結構化時租時，未按車種過濾的官方備註可能把私家車／混合車種費率呈現為電單車價格。
2. **路邊泊位跨車種污染：** 咪錶及非咪錶感應試行資料的分組／結果沒有按 `VehicleType` 隔離；在目前可得字典中，所見代碼並不能證實為電單車泊位，卻可能在電單車模式呈現為有位。

因此，**最小而安全的策略是：先保留已車種隔離的離街資料；先在電單車模式隱藏現有路邊咪錶／感應試行結果，並停止把未分類價格備註當成價格。** 待取得可機讀、可驗證的電單車專屬資料後才擴展顯示範圍。

---

## 官方資料可確認的邊界

| 官方可確認事實 | 對產品的限制／可用結論 | 官方來源 URL |
|---|---|---|
| 一站式停車場 API 支援 `motorCycle` 車種參數，並描述 info 與 vacancy 為分開資料。 | 可把具 `motorCycle` 欄位的離街停車場空位與基本資料作為電單車資料；不能由此推論所有通用設施、備註或路邊資料都適用電單車。 | <https://data.gov.hk/en-data/dataset/hk-dpo-datagovhk1-carpark-info-vacancy/resource/01752c62-a6b6-4ddc-bf2d-25efccadc143><br><https://api.data.gov.hk/v1/carpark-info-vacancy/> |
| 運輸署把路邊電單車泊位分佈列為獨立資訊，並導向香港出行易查詢。 | 現有一般路旁來源不能自動等同於「電單車路邊泊位」；在沒有電單車專屬機讀證據前，應改為官方導向。 | <https://www.td.gov.hk/en/transport_in_hong_kong/parking/on_street_motorcycle_parking_spaces/index.html> |
| 咪錶資料字典中，`A` 明確不包括電單車；`C` 為旅遊巴、`G` 為貨車。 | 現有咪錶代碼不可作為電單車適用的白名單。 | <https://www.td.gov.hk/datagovhk_td/metered-parking-spaces-data/resources/tc/dataspec/metered_parking_spaces_data_dataspec.pdf> |
| 非咪錶感應試行資料字典中，`A` 明確不包括電單車；`C` 為旅遊車、`D` 為傷健人士。 | 現有非咪錶試行代碼不可作為電單車適用的白名單。 | <https://data.nmospiot.gov.hk/api/pvds/Download/nonmeterparkingspacedataspec> |
| 運輸署政府停車場收費頁把私家車／客貨車按小時收費，與電單車日間（08:00–23:00）及晚間（23:00–08:00）收費分開列示，並稱該新收費於 2026-03-01 生效。 | 價格模型必須可表示電單車的日間／晚間類型；私家車價不可用作電單車價的回退。 | <https://www.td.gov.hk/tc/transport_in_hong_kong/parking/carparks/gov_car_parks_managed_by_td/index.html> |
| 運輸署稱其管理的十個政府多層停車場約有 650 個電單車位。 | 此總量僅限該頁所述設施，不能推論任何個別車場的電單車空位或容量。 | <https://www.td.gov.hk/en/transport_in_hong_kong/parking/carparks/index.html> |
| 指定的九龍東即時空位資料資源列有 `motorCycle` 支援。 | 只可在該指定資料範圍內使用，不能外推至全部停車場或路邊泊位。 | <https://data.gov.hk/en-data/dataset/hk-devb-sps-sps/resource/956a6e45-a277-46a7-b6e0-7b5cacb8bcdf> |

---

## 一、必須修正

### 1. 價格：禁止未分類／私家車備註在電單車介面成為費率

**風險**

- `getOfficialPricingNotes` 現時未接收 `vehicleType`，會掃描全場 `heightLimits` 備註；`ParkCard` 與 `ParkDetail` 在電單車沒有專屬時租時會取該通用備註。這是直接把私家車或混合車種價格誤作電單車參考的路徑。
- 本地審核快照中，`operator-rates.json` 的 183 條營辦商價目均只有 `privateCar`，`motorCycle` 條目為 0；這是本地資料覆蓋限制，不表示免費、沒有電單車收費或可把私家車價格套用至電單車。
- 官方政府停車場收費把電單車日／晚收費與私家車收費分列。來源：<https://www.td.gov.hk/tc/transport_in_hong_kong/parking/carparks/gov_car_parks_managed_by_td/index.html>

**最小修正**

1. 把 `getOfficialPricingNotes` 改為接收 `vehicleType`。
2. 僅在備註明確指向所選車種時，才讓該行成為「價格」；無法辨識車種的文字一律歸為**未分類備註**，不顯示為電單車價格。
3. `ParkCard`、`ParkDetail` 均先使用該車種的結構化時租或已驗證營辦商價目；兩者沒有時，顯示：
   > 本站未有核實電單車收費；請以場內標示／營辦商公布為準。
4. 擴充價格型別以表達 `day`、`night`、`monthly` 及其分項；「沒有電單車時租」只能顯示為**未提供／未核實**，不得顯示為零或無收費。
5. 同步保留費率的來源 URL／資料來源識別，且只在官方來源明確列出電單車費率時才新增 `motorCycle` 營辦商價目。

**驗收條件**

- 電單車頁面不會因私家車或混合車種文字而出現金額。
- 明列「電單車」的日、晚、月費資料可按原文和類型呈現。
- 缺資料時不出現 `HK$0`、`免費`、私家車金額或「無收費」的推論。

### 2. 路邊泊位：在電單車模式移除目前咪錶／感應試行結果

**風險**

- `src/api/onStreetParking.ts` 雖讀取 `VehicleType`，`src/domain/onStreet.ts` 卻只以類型及街道分組、合計空位並丟失車種；`App` 亦未依目前車種過濾。因此路邊總數不能安全解讀為電單車空位。
- 咪錶與非咪錶試行的已知代碼均沒有可安全納入的電單車代碼；`A` 反而明確排除電單車。來源：<https://www.td.gov.hk/datagovhk_td/metered-parking-spaces-data/resources/tc/dataspec/metered_parking_spaces_data_dataspec.pdf>、<https://data.nmospiot.gov.hk/api/pvds/Download/nonmeterparkingspacedataspec>。
- 運輸署另設路邊電單車泊位資訊頁並導向香港出行易，未在本次資料中提供可供本 PWA 直接映射的電單車專屬即時空位 API／欄位。來源：<https://www.td.gov.hk/en/transport_in_hong_kong/parking/on_street_motorcycle_parking_spaces/index.html>。

**最小修正**

1. 電單車模式下，**不載入、不合併、不顯示**現有咪錶及非咪錶感應試行泊位；隱藏 `onStreet` 篩選／附近路邊位控制，並在車種切換為電單車時清除已啟用的 `onStreet` 條件。
2. 以清楚說明取代結果清單：
   > 現有路旁咪錶／感應試行資料未證實適用電單車，因此未顯示為電單車泊位。請於運輸署路邊電單車泊位資訊／香港出行易查詢。
   文字中的官方連結：<https://www.td.gov.hk/en/transport_in_hong_kong/parking/on_street_motorcycle_parking_spaces/index.html>
3. 日後若取得官方資料，保留 `VehicleType`、把車種納入分組鍵、先以官方定義的**保守白名單**過濾，再按目前 `vehicleType` 顯示。未知代碼一律視為未核實，而非適用。
4. 路邊資料的導航連結移除固定 `travelmode=driving`；未有官方文件證明電單車導航模式前，使用中性目的地連結。

**驗收條件**

- 選擇電單車後，現有路旁來源的「有位」不會出現在卡片、詳情、地圖或附近模式。
- 已保存的 `onStreet` 篩選不會造成電單車模式的誤導性零結果。
- 未來有資料時，每筆／每個群組均能追溯其 `VehicleType` 及官方代碼定義。

### 3. 篩選與設施：移除未證實的「電單車適用」暗示

**風險**

- 有位是按 `motorCycle` 空位記錄判斷，這一點正確；但車高取全場 `heightLimits` 的最低正數、EV 使用場地標記或附近充電器、無障礙則把任一車種的 `spaceDIS` 視為場地支持。這些均不是電單車專屬保證。
- 電動車推廣官方頁未構成「每個公共充電點均適合電動電單車」的承諾。來源：<https://www.epd.gov.hk/epd/tc_chi/environmentinhk/air/promotion_ev/promotion_ev.html>
- 一站式資料可確認 `motorCycle` 車種及 info/vacancy 的分離，但本次來源沒有證明高度、EV 或無障礙欄位對電單車的適用性。來源：<https://data.gov.hk/en-data/dataset/hk-dpo-datagovhk1-carpark-info-vacancy/resource/01752c62-a6b6-4ddc-bf2d-25efccadc143>

**最小修正**

1. 選擇電單車時，隱藏並清除「車高」「EV」「無障礙泊位」作為硬性篩選；同時在篩選函式中排除這些舊條件，避免已存狀態造成零結果。
2. 保留「只看有位」「只看開放」及一般附近設施，但重寫語義：
   - 有位：**電單車空位已報告**；無資料為「未知／未提供」。
   - 開放：**車場整體開放狀態**，不是電單車准入保證。
   - 附近洗手間、油站、ATM：**附近設施**，不是泊車或車種准入保證。
3. 如仍須顯示高度、EV 或無障礙資料，只可列為非篩選的「場地資料」，並加上：
   > 資料未證實適用於電單車；請以現場標示及營辦商安排為準。
4. 修正空結果摘要和「清除篩選」捷徑，使其只列出及清除實際仍有效的條件。

**驗收條件**

- 電單車切換後不會由車高、EV、無障礙或路邊位條件排除結果。
- 卡片、詳情、篩選 chip 與空結果訊息不宣稱 EV／無障礙／高度資料「可供電單車使用」。

### 4. 車種上下文與未知值：防止地圖／快取造成錯誤理解

**風險**

- `ParkDetail` 的容量、費率和狀態會跟隨 `vehicleType`，但 marker、tooltip、地圖圖例及專注模式沒有明示目前車種；最近查看按停車場 ID 保留，跨車種可造成上下文混淆。
- 缺 `motorCycle` 資料、`-1` 或未上報目前可成 unknown；預設「只看有位」會令 unknown 不可見。未知不能當成零或已滿。
- Pages 離線時會 network-first 後靜默回退快取；若不提示資料時間，使用者不能辨別即時與舊資料。此為 PWA 實作行為；一般快取策略背景資料可參閱：<https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching>。

**最小修正**

1. 在 marker tooltip、圖例、專注地圖和詳情標題加入「目前查看：電單車」；容量／空位旁保留車種標籤。
2. 車種切換時清除最近查看高亮，或把最近查看的鍵改為 `park_Id + vehicleType`。
3. 缺 `motorCycle` 空位或總位時固定顯示「未提供／未知」，永不回退 `privateCar`；把「只看有位」文案改成「只顯示**已報告**有電單車空位」，並提供可看到未知項目的路徑。
4. 離線回退快取時顯示「離線快取資料」及最後更新時間；英文狀態應按 `VacancyKind` 完整翻譯，而不是回退繁中 `status.label`。
5. 如 Pages 仍固定建立 `zh_TW` 停車場資料，英文界面須標明來源資料語言，或同時產生 `en_US`、`zh_TW` 資料；不可令中文來源被誤認為完整英文官方內容。

---

## 二、可安全保留

下列行為已經是保守且車種隔離的實作；修正時不應破壞它們。

| 可保留行為 | 已驗證依據／保留條件 |
|---|---|
| 離街空位以 `vacancyById[park_Id]?.[vehicleType]` 讀取。 | `motorCycle` 切換會讀取對應記錄，沒有以私家車空位回退；與 API 的 `motorCycle` 支援一致。官方來源：<https://api.data.gov.hk/v1/carpark-info-vacancy/> |
| 離街總車位以 `info[vehicleType]?.space` 讀取。 | 不以私家車總位補電單車缺值；缺值繼續表示未提供即可。 |
| 結構化時租及已驗證營辦商價目按所選車種索引。 | 應保留此資料隔離規則；只需封鎖未過濾的文字備註回退。 |
| `A/B/C`、`-1`、`0` 等空位值正規化為可用／已滿／未知。 | 保留「未知」這個獨立狀態；不能壓平成零或已滿。官方電單車空位 API 可用：<https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=motorCycle> |
| 車種切換時清除目前選取的停車場。 | 可避免在新車種下沿用舊詳情；另按上述要求處理最近查看高亮。 |
| 地址、付款及一般場地設施作為共用場地資料。 | 可繼續展示為「場地資料」；不可改寫成電單車泊車准入、充電相容或無障礙保障。 |
| 「只看有位」「只看開放」及一般附近設施模式。 | 前提是分別標明電單車已報告空位、車場整體開放及附近設施，且路邊泊位不在電單車模式顯示。 |

---

## 三、資料來源沒有涵蓋，必須清楚說明

這些是**資料缺口**，不是負面事實；介面與文件不可自行補全、推斷或把其他車種資料當作替代值。

| 未被目前資料覆蓋的問題 | 不可作出的推論 | 必須顯示／採取的做法 | 相關官方來源 URL |
|---|---|---|---|
| 電單車專屬的路邊即時空位與可用機讀欄位 | 不能把咪錶或非咪錶感應試行的總數、空置狀態或 `VehicleType` 未分組資料當成電單車泊位。 | 隱藏現有路邊結果；顯示未核實說明並導向運輸署／香港出行易。 | <https://www.td.gov.hk/en/transport_in_hong_kong/parking/on_street_motorcycle_parking_spaces/index.html><br><https://resource.data.one.gov.hk/td/psiparkingspaces/spaceinfo/parkingspaces.csv><br><https://data.nmospiot.gov.hk/api/pvds/Download/parkingspace> |
| 車高限制是否適用電單車 | 不能把全場最低限高、或明列其他車種的限高，說成電單車限制。 | 不作電單車硬篩選；若展示，保留原文／適用車種並標為場地資料、未證實適用。 | <https://data.gov.hk/en-data/dataset/hk-dpo-datagovhk1-carpark-info-vacancy/resource/01752c62-a6b6-4ddc-bf2d-25efccadc143> |
| EV 充電點能否供電動電單車使用 | 不能把車場 EV 標記或附近充電器說成電單車可充電保證。 | 停用電單車 EV 硬篩選，或加相容性／可用性警示和現場確認指示。 | <https://www.epd.gov.hk/epd/tc_chi/environmentinhk/air/promotion_ev/promotion_ev.html> |
| `spaceDIS`、無障礙設施對電單車的適用性 | 不能因任何車種有 `spaceDIS` 就標示「電單車無障礙泊位」。 | 不作電單車無障礙硬篩選；只可稱場地資料且未證實車種適用。 | <https://data.gov.hk/en-data/dataset/hk-dpo-datagovhk1-carpark-info-vacancy/resource/01752c62-a6b6-4ddc-bf2d-25efccadc143> |
| 每個停車場的電單車營辦商價目 | 不能把現有只歸屬 `privateCar` 的營辦商資料、通用備註或私家車收費轉作電單車價格。 | 顯示「未有核實電單車收費」；只加入官方明列電單車的資料。 | <https://www.td.gov.hk/tc/transport_in_hong_kong/parking/carparks/gov_car_parks_managed_by_td/index.html><br><https://www.telford-plaza.com/tch/parking><br><https://www.linkhk.com/tc/parking/1004> |
| 未上報／`-1` 的電單車空位與總位 | 不能理解成零位、已滿、無電單車泊位或不開放。 | 用「未知／未提供」，並容許使用者在關閉「只看有位」後看見。 | <https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=motorCycle> |
| 電單車專屬導航模式 | 不能把固定 `travelmode=driving` 描述為已確認的電單車導航。 | 使用中性目的地連結，直至有可支持的官方文件。 | 無本次審核所列官方來源可確認；不作此項宣稱。 |
| 英文官方資料等價性與離線資料新鮮度 | 不能把固定 `zh_TW` 的 Pages 靜態檔說成完整英文官方資料，也不能把未標記的快取說成即時資料。 | 標示來源語言、快取／離線狀態及最後更新時間；英文 UI 完整翻譯狀態字串。 | <https://data.gov.hk/en-data/dataset/hk-dpo-datagovhk1-carpark-info-vacancy><br><https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching> |

---

## 最小實作優先次序

| 優先級 | 可直接執行的變更 | 涉及位置 | 完成定義 |
|---|---|---|---|
| **P0-1** | 為 `getOfficialPricingNotes` 加入 `vehicleType`，只接受明確相符的價格備註；同步修正 `ParkCard`、`ParkDetail` 的回退和空值文案。 | `src/domain/carpark.ts`、`src/components/ParkCard.tsx`、`src/components/ParkDetail.tsx` | 電單車無結構化費率時永不顯示私家車／未分類金額；顯示未核實提示。 |
| **P0-2** | 電單車模式把 `onStreet` 結果固定排除、隱藏控制及清除舊篩選；加入官方導向說明。 | `src/App.tsx`、路邊結果／卡片／詳情元件 | 電單車地圖、列表、附近模式沒有現有路旁位，且不會因舊條件得到假零結果。 |
| **P0-3** | 在電單車模式清除並停用車高、EV、無障礙硬篩選；改寫有位、開放和附近設施的文案。 | 篩選 state／predicate、`App.tsx`、相關控制及空結果元件 | 不再把場地層級資料表述為電單車保證，亦不由它們排除電單車結果。 |
| **P0-4** | 加入上述 P0 的單元／整合測試。 | `carpark`、`onStreet`、篩選與卡片／詳情測試 | 覆蓋：私家車備註不得出現在電單車；全部現有路邊來源在電單車為空；舊篩選被清除；未知不變為 0。 |
| **P1-1** | 補齊 `day`／`night`／`monthly` 價格型別與分項顯示，並保留每項來源。 | 型別、資料正規化、卡片及詳情 | 能呈現明確電單車日／晚／月費；缺項仍為未提供。 |
| **P1-2** | 在 marker、tooltip、圖例、專注模式加車種上下文；最近查看改為按車種或切換時清除；導航改中性連結。 | `MapView.tsx`、`App.tsx`、路邊卡片／詳情 | 使用者可在所有地圖狀態辨認「電單車」上下文，不會跨車種高亮或強加駕車模式。 |
| **P1-3** | 改善 unknown、英文狀態、Pages 語言和快取提示。 | `i18n.ts`、`scripts/build-pages-data.mjs`、`public/sw.js`、狀態元件 | unknown 可辨認可到達；英文不混用繁中狀態；離線資料有時間和狀態。 |
| **P2** | 只有在取得官方、可機讀且明確車種定義的資料後，重新引入電單車路邊結果。 | 新資料適配層、`onStreet` domain、UI | `VehicleType` 全程保留；分組鍵含車種；官方白名單／未知處理、來源連結和測試齊備。 |

## 建議的回歸測試案例

1. **價格隔離：** `motorCycle` 無時租、同場備註含「私家車 HK$25／小時、電單車 HK$10／小時」時，只可顯示明確的電單車 HK$10；只有私家車文字時顯示未核實提示。
2. **空位隔離：** `privateCar` 有空位、`motorCycle` 缺值或 `-1` 時，電單車狀態為未知，不得顯示私家車數字、已滿或零。
3. **容量隔離：** `motorCycle.space` 缺值、`privateCar.space` 有值時，電單車總位為未提供。
4. **路邊保守處理：** 任一現有咪錶／非咪錶 `A`、`C`、`D`、`G` 記錄，即使狀態為空置，也不得在電單車模式出現。
5. **舊篩選狀態：** 已開啟 EV、無障礙、車高或路邊位再切換電單車時，這些狀態被清除／忽略；空結果只描述仍有效條件。
6. **文案與快取：** 英文界面不輸出繁中 `status.label`；離線回退資料明示為快取及最後更新時間。

## 發布前檢查

- [ ] 電單車介面沒有未明確對應 `motorCycle` 的價格金額。
- [ ] 電單車介面沒有現有路旁咪錶／感應試行泊位結果。
- [ ] 空位、總位及費率缺值皆為「未知／未提供／未核實」，從不以私家車補值。
- [ ] 車高、EV、無障礙只以正確的場地層級文案展示，或在電單車模式停用。
- [ ] 地圖、詳情、最近查看、圖例與導航不會失去電單車上下文。
- [ ] 每項新增的官方事實、價格或未來路邊資料都有可追溯的來源 URL 和車種適用範圍。


---

## 2026-10-09 實作結果（P0）

已落實本審核的三項 P0 保守修正：

1. **收費隔離：** `getOfficialPricingNotes` 現接收目前 `vehicleType`，只接受明確列出該車種的備註；若同一行明確列出多個車種，會供每一個已列出的車種使用。電單車不再取私家車、未列出電單車的混合車種或未分類價目；結果卡及詳情在沒有已核實價目時改為「未有核實電單車收費，請以場內標示／營辦商公布為準。」已核實的營辦商快照仍只按所選車種讀取。
2. **路邊位隔離：** 路邊資料保留 `VehicleType` 並納入分組鍵。程式白名單為私家車 `A`、輕型貨車 `A/G`、重型貨車 `G`、旅遊巴 `C`；`D` 不會混入一般車種。電單車沒有可用代碼，因此不載入現有咪錶／感應試行結果，而是在第二列顯示直達運輸署「路邊電單車泊車位分佈」的官方連結。
3. **電單車篩選上下文：** 電單車模式保留「只看有位」和「只看開放」，清除並隱藏車高、EV、無障礙硬篩選；切換車種也會清除停車場／路邊位選取及最近查看高亮。卡片和詳情不再把車高、EV 或無障礙作為電單車可用保證，仍按 `motorCycle` 的官方空位與總位顯示。

### 驗證證據

- `pnpm test:motorcycle`：145 筆官方非咪錶試行快照沒有電單車可用代碼；車種白名單及車種收費隔離規則存在。
- `pnpm test:official-pricing`：583 筆初始官方停車場資料中有 65 筆明確寫明電單車收費的備註；車種隔離規則接受這些資料而不把未分類字串當作價錢。
- `pnpm test:on-street`、`pnpm test:on-street-limit`、`pnpm check`、一般建置、Pages 建置、Pages/PWA 檢查及 `git diff --check` 全部通過。
- 390px 手機互動測試：選取電單車後，車高／EV／無障礙控制均不存在，顯示運輸署官方路邊電單車位連結，且地圖沒有現有路邊 marker；切回私家車後，路邊模式顯示 105 個符合 `A` 代碼的 marker；再次切回電單車會自動清除路邊模式。英文模式顯示 `Motorcycle roadside spaces ↗`，沒有車高控制。

P1 的日夜／月費細分、離線新鮮度提示、資料來源語言與地圖車種上下文仍保留在本審核的後續優先次序中，未被誤列為本次已完成項目。


---

## 2026-10-09 更正：已取得官方可機讀電單車位置／數量圖層

本審核最初的「導向運輸署／香港出行易」保守結論，只基於智能咪錶及感應試行資料字典；它仍然適用於**即時空位**，但不再適用於位置及數量。其後已核實運輸署／香港出行易 WFS 的 `DRSS:VW_ON_STREET_PARKING`，可用 `VEHICLE_TYPE = 'Motor Cycles'` 取得官方 WGS84 位置、街名、營運時間、咪錶標記及泊位數量。

因此取代第 59–80、146、162、168 與 175 項中「只隱藏／外連」的後續假設：

1. 電單車模式繼續排除智能咪錶與感應試行的即時路邊資料，因那些官方字典仍未給予電單車即時空位白名單。
2. 同一模式在 App 內改讀香港出行易 `Motor Cycles` 官方靜態圖層，按街道群組顯示位置及**總數**。
3. 卡片、marker、詳情、來源及說明均明確標示「沒有即時空位」；不使用此圖層推論有位、已滿、收費或電單車專屬導航。
4. 完整端點、欄位、快照統計、建置策略及手機驗證見 [`2026-10-09-motorcycle-hkemobility-source.md`](2026-10-09-motorcycle-hkemobility-source.md)。
