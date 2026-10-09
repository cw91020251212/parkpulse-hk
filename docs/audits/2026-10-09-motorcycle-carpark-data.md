# ParkPulse HK PWA：電單車停車場資料範圍審核

- **審核日期：** 2026-10-09
- **範圍：** 政府停車場基本資料、車種分欄空位／總車位／收費、正規化及篩選；檢查會否將私家車資料誤用於電單車。
- **審核方式：** 只讀程式與附帶快照，並查閱官方政府資料規格／資料集頁；沒有修改程式、資料或其他既有文件。

## 結論摘要

資料模型和即時空位主流程以車種欄位隔離，電單車頁面通常使用 `motorCycle` 的空位、總數和費率，未見私家車空位或總數直接回退至電單車的程式碼。**已確認的車種污染風險在收費備註：**當電單車沒有結構化時租、且沒有相應營辦商費率時，卡片及詳情仍讀取不分車種的全場 `heightLimits[].remark` 作價錢參考；備註可能明確講私家車，甚至同列數個車種的收費，造成電單車卡片標示私家車價或非電單車專屬價格。結構化 `motorCycle` 的日泊／月租又不會成為目前「時租」的主價顯示。

建議最小修正為：只將已確認屬所選車種的價格備註交給該車種 UI；如來源備註無法可靠分車種，電單車顯示「官方未提供電單車時租」並提供原始備註連結／清楚標示「未分類收費備註」，不可當作電單車價錢。另應明確區分時租、日泊及月租，不把非時租的存在與否混為一談。

## 官方資料語義（外部事實）

官方規格稱 API 整合運輸署及啟德／九龍東相關資料，參與停車場經營者提供基本資料及空位；`vehicleTypes` 支援 `privateCar`、`motorCycle` 等。基本資料車種物件各自包含 `space`（該車種總泊車位，含電動及非電動）、`hourlyCharges`、`dayNightParks`、`monthlyCharges` 等；電單車亦有自己的車種物件。空位資料亦各有 `motorCycle` 欄位：`vacancy` 是該車種空位，`vacancy_type` A 表示實際數目、B 表示不提供實數的有位／滿、C 表示停車場關閉；A/B 下 `-1` 表示經營者未提供數據，`0` 表示滿。`category` 可為 HOURLY、DAILY、MONTHLY。

官方資料集頁說明此 One-Stop API 匯整運輸署及 EKEO 開放資料。這些定義支持「車種欄位應按車種獨立解讀」；官方規格沒有保證任何快照必定提供所有車種、所有收費類型或實時空位，也沒有把缺欄定義為 0。

## 程式現況及證據

### 1. 載入／正規化

- `src/api/carparks.ts:4-8, 47-53, 66-83`：API base 為政府 One-Stop endpoint；基本資料先讀 `public/carpark-info.json`，失敗才請求 `data=info&lang=zh_TW`；空位另請 `data=vacancy`。快照外層格式要求 `results` 陣列。快取基本資料 24 小時，空位由 hook 每 60 秒更新。
- `src/api/carparks.ts:55-64`：另以 `park_Id` 把 operator-rate snapshot 的車種費率掛回同一停車場；沒有用 privateCar rates 作 motorcycle fallback。
- `src/types.ts:1-17, 21-34, 50-89`：`VehicleType` 包含 `motorCycle`；`CarparkInfo` 的 `privateCar`、`motorCycle` 等分欄；`VacancyRecord` 同樣各有獨立陣列。`VehicleParkingInfo` 型別只收錄 `space`、`spaceEV`、`spaceDIS`、`hourlyCharges`，沒有列出政府的 day/night/monthly 等欄位，雖執行時資料仍可包含它們，但 TypeScript 型別不完整。
- `src/domain/carpark.ts:37-46, 52-89`：從所選車種 vacancy entries 排序，HOURLY／未分類優先，然後按香港時間更新時間新到舊；A/B/C、0、-1 正規化為數字空位／有位／滿／關閉／未知。由此一來 DAILY、MONTHLY 並非首選，但沒有時租時仍可被選中。
- `src/App.tsx:108-119`：每一停車場以當前 `vehicleType` 取 `vacancyById[park_Id]?.[vehicleType]`，再計狀態；「只顯示有位」由該狀態篩選。車種切換不會改變空位查詢欄位。`openOnly` 依基本資料 `opening_status` 與該車種關閉狀態篩選。沒有先排除「該車種根本無記錄」的停車場，故 unknown 可顯示；預設 `availableOnly: true` 會自然濾走 unknown。

### 2. 電單車空位、總位與基本資料

- `src/components/ParkCard.tsx:25, 33-35`、`src/components/ParkDetail.tsx:26, 31, 36`：總位均直接取 `info[vehicleType]?.space`，所以選電單車時讀 `motorCycle.space`，缺資料則不顯示／標示未提供，未見私家車 `.space` fallback。空位狀態由 App 已按車種選出的記錄傳入。
- 基本地址、地區、座標、開放狀態、聯絡、設施及付款方法是停車場共用資料（ParkDetail 30、38-39）；這些本身不是私家車專屬值。高度限制是停車場共用 `heightLimits`，規格只提供限制值及可選說明，可能按車種分列，`getHeightLimit` 卻取所有高度中的最小值（`src/domain/carpark.ts:99-104`）。因此若某場 remarks 含「私家車」／貨車等分車種限高，電單車 UI 可能被較低的私家車限高誤導；應只作一般場地限制或按 remark 顯示原始適用車種，不應宣稱是電單車限高。

### 3. 收費：確認的車種污染點

- `src/domain/carpark.ts:189-207`：結構化時租優先取 `getVehicleInfo(info, vehicleType)?.hourlyCharges`；若所選車種沒有可用時租，就從 `heightLimits[].remark` 解析時租，惟 parser 的 `namedVehicleTypes` 只在逐行擷取時租備註上用來追蹤上下文（141-168）。
- 同檔 `170-187` 的 `getOfficialPricingNotes(info)` 完全不接收 `vehicleType`，對同一停車場所有 `heightLimits[].remark` 收集有金額符號的行及前置上下文。
- `ParkCard.tsx:21-24`：電單車沒有 operator rate 或解析到的時租時，會將 `getOfficialPricingNotes(info)[0]` 當 `pricingReference` 顯示在卡片。
- `ParkDetail.tsx:22-25, 37`：詳情雖按電單車取得結構化費率，但備註 fallback 仍是全場無車種區分的 `getOfficialPricingNotes(info)`；所以具體泄漏位置確認在 UI 的費率參考／官方收費備註，不是總車位或 vacancy。
- 解析缺陷補充：`extractHourlyChargesFromNotes` 的 `contextVehicles` 遇到新車種行才更新；未識別車種的後續行會沿用之前車種 context。若原始備註排列或語句不符目前 regex，單靠這個文字解析不能可靠判定適用車種。不可把 heuristic 當作官方標準化欄位。
- 若 `operatorRate` 存在，卡片用其 summary；詳情用其 hourly summary，但 `detailNotes` 仍可包含營辦商說明。資料來源快照的分車種記錄應維持檢查，避免內容本身引用其他車種條款而被誤讀。

### 4. 快照抽查

- 附帶 `public/carpark-info.json` 有 **583** 個結果；其中 **27** 個記錄有 `motorCycle` 物件；5 個 `motorCycle.space > 0`。在含該物件的資料中，5 個具有各類結構化費率（hourly、day/night、monthly 分別各 5 個，類別有交疊）。這只描述本地快照，不代表全港覆蓋率或即時現況。
- 例：`park_Id=27` 油麗商場停車場的 `motorCycle.space=2`、電單車時租 HK$2；同一筆 `privateCar.space=11`、私家車時租 HK$17。此例可驗證官方快照本身確實有車種差異，照所選 `vehicleType` 分欄是必要的。
- 例：`park_Id=81` 宏利廣場的電單車有 `space=20` 及自己的 hourly/day-night/monthly 費率；程式目前卡片的簡短主價只讀 hourly，其他收費在 schema/types 尚未建模。
- 快照另含原始 remark 例子將「私家車」及其他車種價格放在同一類 remarks（例如 `park_Id=318` 百勝角路公眾停車場的 height-limit remark 同列私家車 HK$25／小時、電單車 HK$10／小時、輕型貨車 HK$30／小時）。這是快照內可見的非結構化文字；目前全場備註 fallback 不具車種分類能力，可能整段錯誤顯示。由於該例 `motorCycle` 欄位缺失，不代表現有已顯示車位一定採用到該價，而是證明原始備註不能在未分類下當成特定車種費率。
- 基本資料中省略 `motorCycle` 與明確 `space: 0` 在語義上不同；官方規格說無相關資料時車種物件可以不返回。UI 不應將缺欄換成私家車數字，也不應在產品層把缺欄聲稱為「0 個位」。

## 最小修正建議（不代表已修改）

1. 為收費備註解析加入明確 vehicleType 輸入；只有具備明確車種標籤且解析可確認適用的備註才呈現為所選車種收費。無法確認適用車種的通用備註應標示「未分類官方備註」而非作為電單車價格；明確私家車行不得傳給電單車卡片／時租欄。
2. 補足 `VehicleParkingInfo` 官方欄位（dayNightParks、monthlyCharges 及必要的其他 charge rules）型別及展示；顯示收費類型與適用時段。缺少 `motorCycle.hourlyCharges` 不等於沒有電單車任何收費，也不能用私家車時租補空。
3. `heightLimits` 需保留 `remark` 和適用車種提示；不確定時以「停車場公布高度限制（原文）」呈現，不能把跨車種最小高度說成電單車專屬上限。
4. vacancy 分類維持所選車種欄位，不把無資料轉成 0；可在 UI 明示所選車種暫無空位資料。此項目前主流程已大致符合，毋須大改。

## 未能由公開資料確認的限制

- 官方規格為 2020 年版本；它界定欄位，但未能確認當日（2026-10-09）服務是否完全維持規格、快照是否最新，亦未查證每個營辦商提供的欄位實際完整程度。
- 僅由靜態 JSON 抽查記錄，不可推論全港電單車位總量、資料更新率、政府停車場特定支援範圍或當前場內實況。
- 官方文件沒有交代 omission 與 `space: 0` 的細部運作規則以外的語義，亦未確認某些 remarks 的多車種格式是否為固定規範；文字 parser 不可取代官方分車種結構欄位。
- `getOfficialPricingNotes` 目前只掃描 `heightLimits[].remark`；其文字在上游如何產生、是否一定是收費公告而非高度相關備註，公開 schema 未作更細語義保證。

## 官方來源

1. DATA.GOV.HK「Parking Vacancy Data (One-Stop Version)」資料集及彙整來源說明：<https://data.gov.hk/en-data/dataset/hk-dpo-datagovhk1-carpark-info-vacancy>
2. 運輸署／政府 Parking Vacancy Data Specification v1.2（2020-01-14），API 參數、資料字典及 A/B/C／空位語義：<https://resource.data.one.gov.hk/opendata/carpark/Parking_Vacancy_Data_Specification.pdf>
3. 政府 API endpoint（程式目前使用）：<https://api.data.gov.hk/v1/carpark-info-vacancy/>
