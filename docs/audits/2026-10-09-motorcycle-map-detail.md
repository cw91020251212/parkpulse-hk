# ParkPulse HK PWA 電單車地圖／詳情支援範圍審核

- **審核日期：** 2026-10-09
- **範圍：** 電單車模式下地圖 marker、選取、詳情、最近查看、導航、地圖專注及標示是否使用正確車種資料。
- **方法：** 只讀取程式及官方公開資料；未修改產品程式或既有文件。本報告只將可由程式或官方來源確認的內容列為事實。

## 總結

離街停車場（carpark）核心流程的空位、容量及收費，會以 `motorCycle` 車種索引計算並傳至 marker、卡片及詳情；點選與最近查看狀態依停車場 ID 記錄，不會將私家車空位直接代入電單車狀態。惟 marker 本身沒有車種提示，車種切換後最近查看標記仍可留在同一停車場，使用者未必知道 marker 顯示的是哪一車種。

明確問題在路邊泊位模式：程式讀入咪錶資料中的 `VehicleType`，但分組時不按車種區分，之後丟棄該欄位；卡片、marker、詳情合併顯示全組泊位數，且導航一律附 `travelmode=driving`。因此不能確認該路邊結果是電單車專用泊位，亦不能把合計空位視為電單車空位。此為主要修正優先項。官方運輸署另提供路邊電單車泊位查詢資訊，但公開頁面未提供可在此核實的可程式化資料欄位／即時空位介面。

## 逐項現況與影響

| 項目 | 現況與程式證據 | 電單車影響／判斷 |
|---|---|---|
| 車種狀態與 marker | `App.tsx:108` 以 `selectVacancyEntry(vacancyById.get(info.park_Id)?.[vehicleType])` 取得所選車種空位，再生成 `park.status`；`MapView.tsx:34,42` marker 顯示該 `status` 的數量／有位／滿／關／未知，點擊以停車場 ID 選取。 | 電單車模式下 marker 的狀態資料取自 `motorCycle` 分支（前提是後端返回該型別資料）；沒有將 car 狀態直接畫在 marker 上。Marker 樣式／色彩本身不具車種識別，無車種標籤。 |
| 選取 | `App.tsx:142` 的 `openDetail` 記錄 `parkId` 並設 `selectedId`；`MapView.tsx:40,42` 按 ID 尋找 selected，marker 點擊亦傳該 ID。車種切換 handler（`App.tsx:154`）更新 `vehicleType` 並清除 `selectedId`。 | 選取對象是停車場，而非某車種的獨立紀錄；切換車種會清除詳情選取，避免上一車種詳情留在面前。 |
| 詳情容量／收費 | `ParkDetail.tsx:22-26,36-37` 將 `vehicleType` 傳至 operator rates、官方時租、價格格式化，容量讀 `info[vehicleType]?.space`；`App.tsx:161` 將目前車種傳入詳情。`domain/carpark.ts:27-28,91-93,189-206` 分別以車種索引收費及車輛資料。 | 電單車詳情容量、已核實營辦商時租與官方收費均以 `motorCycle` 查值。未提供／未解析的數值呈現「未提供」而非改用私家車資料，屬合適的保守回退。高度限制、設施及付款方式為停車場層級欄位，程式未按車種分拆；不能據此當作電單車專屬適用條件。 |
| 最近查看 | `App.tsx:86,142-145` 最近查看記錄是 `lastViewedParkId`，不是車種／狀態快照；`MapView.tsx:34,42` 只按 ID 加 `is-last-viewed` 樣式和提高層級。位置選擇會清除該 ID；車種切換不清除它。 | 高亮只是「最近查看此停車場」，不是「電單車空位」的證明。切換到另一車種時 marker 狀態會重新以新車種計算，但最近查看外觀維持。建議明確標示車種或在模式切換時清除/同步最近查看提示，以免認知混淆。 |
| 導航 | Carpark 詳情 `ParkDetail.tsx:18,39` 只把經緯度作 Google Maps 目的地，沒有固定 `travelmode`；路邊卡片 `OnStreetParkingCard.tsx:13,22` 與詳情 `OnStreetParkingDetail.tsx:10,32` 則固定附 `travelmode=driving`。 | Carpark 導航目的地正確，但程式未能證明 Google Maps 導航會依電單車車種選路。路邊導航固定 driving，並非電單車專用路線模式；不應宣稱支援電單車路線。 |
| 路邊 marker／選取／詳情資料 | `onStreetParking.ts:31-41` 讀入 `location.VehicleType` 並存到每條咪錶記錄；`domain/onStreet.ts:14-46` 分組 key 只有 `kind` 與街道名，聚合每筆紀錄的 `total/vacant/occupied/unavailable`，輸出 group 不含 `vehicleType`。`MapView.tsx:36,42` 用組合的 `vacant` 作 marker 數字，點擊以 on-street group ID 選取；`OnStreetParkingCard.tsx:14-20` 及 `OnStreetParkingDetail.tsx:20-27` 顯示 group 合計。 | 如果同一街道／類別記錄涵蓋不同 VehicleType，程式會把車種混合計數；更根本地，車種欄位讀取後未用於篩選或呈現。電單車模式不會自動轉成路邊電單車泊位模式。現時不能將這些 marker、卡片或詳情合計解讀為電單車專屬空位。是否實際混有不同車種記錄，須由官方資料的實際列及定義確認；此處不臆測。 |
| 地圖專注 | `MapView.tsx:39-42` 專注按鈕只切換 `expanded`，影響尺寸／顯示；`App.tsx:141,152,157` `mapExpanded` 不更換 `vehicleType` 或 marker 資料，仍傳目前 `mapParks`。`styles.css:130-135` 只隱藏周邊 UI、放大地圖。 | 專注模式本身不會切回私家車資料，已選車種的 marker 資料仍在；但專注模式隱藏結果列表與圖例（CSS），且地圖沒有車種水印，車種上下文更不明顯。 |
| 圖例／標示 | `App.tsx:157` 圖例標示空位、滿位、關閉、未知及設施類型，未標示車種；`MapView.tsx:34` marker 以字母/數字表示狀態。`styles.css:63-69,118` 為共用視覺樣式。 | 狀態色彩可對應所選車種的 carpark status，但沒有車種標籤；讀者離開篩選列／進入專注地圖後不能從 marker 判別其資料是電單車。 |

## 證據及官方資料

### 程式證據（本地只讀檢查）

- `src/App.tsx:108`：每個 carpark 的 vacancy entry 由目前 `vehicleType` 索引；`119`：可用性篩選使用該 `park.status`。
- `src/App.tsx:142-145,154,157,161`：選取、最近查看、車種切換、MapView props 與詳情 props 的連接。
- `src/components/MapView.tsx:34,40-42`：marker 渲染採 `park.status`；最近查看只依 park ID；路邊 marker 依 `onStreet.vacant`，點擊選取該 group；路邊導航字串帶 `driving`。
- `src/components/ParkDetail.tsx:18,22-26,36-39`：詳情導航目的地、依車種的容量與費用。
- `src/api/onStreetParking.ts:31-41`：資料讀取 `VehicleType`；`src/domain/onStreet.ts:14-46`：分組 key 不含該欄位並聚合數量。
- `src/components/OnStreetParkingCard.tsx:13-20`、`src/components/OnStreetParkingDetail.tsx:10,20-32`：路邊資料無車種提示且固定駕車導航。
- `src/styles.css:130-135`：專注模式為版面顯示調整；`App.tsx:157` 圖例未列車種。

### 官方來源（僅引用官方網站）

1. [data.gov.hk：Parking Vacancy Data (One-Stop Version) API 資源說明](https://data.gov.hk/en-data/dataset/hk-dpo-datagovhk1-carpark-info-vacancy/resource/01752c62-a6b6-4ddc-bf2d-25efccadc143) 列明 API 的 `vehicleTypes` 支援 `privateCar`、`LGV`、`HGV`、`CV`、`coach` 及 `motorCycle`；`data=vacancy` 返回空位資料，`data=info` 返回基本資料。故車種分支是官方 API 可用的概念，並不代表每一停車場均必有 motorCycle 記錄。
2. [data.gov.hk：一站式停車場空位資料集](https://data.gov.hk/en-data/dataset/hk-dpo-datagovhk1-carpark-info-vacancy) 說明整合運輸署及啟德發展辦公室來源；資料集描述本身不足以證明每個停車場都有各車種實時空位。
3. [運輸署：路邊電單車泊位](https://www.td.gov.hk/en/transport_in_hong_kong/parking/on_street_motorcycle_parking_spaces/index.html) 說明電單車路邊泊位資訊可在 TD 的 HKeMobility 網站或手機應用程式查詢。該公開頁未列出可供本 PWA 使用的欄位/API、資料涵蓋範圍或即時空位；因此不能由此頁確認現有咪錶/路旁感應資料可代表電單車泊位。
4. [運輸署：Carparks](https://www.td.gov.hk/en/transport_in_hong_kong/parking/carparks/index.html) 公布其管理的 10 個政府多層公共停車場約有 650 個電單車泊位。此整體數字不能推論個別停車場的可用空位或費率。
5. [data.gov.hk：九龍東參與停車場實時空位資料](https://data.gov.hk/en-data/dataset/hk-devb-sps-sps/resource/956a6e45-a277-46a7-b6e0-7b5cacb8bcdf) 說明其參與停車場資料可支援 `motorCycle` 等車種；範圍明確限於九龍東參與停車場，不能當作全港普遍覆蓋。

## 最小修正建議

1. **路邊資料先做到車種正確：** 保留來源 `VehicleType` 並明確解析成受控值；將車種納入 `groupOnStreetResults` 分組鍵與輸出型別，依目前車種篩選，或在未能取得權威電單車泊位資料時把該資料明確標示為「非電單車專用／車種未核實」，不可把總數呈現為電單車空位。只在官方來源明確表示可用、並確認語義及覆蓋後，才提供「電單車泊位」專屬切換。
2. **不混用導航語義：** Carpark 導航保留目的地並說明會交由 Google Maps 決定路線；路邊導航不要無條件標作電單車導航或假設 driving 支援機車路線。只有外部地圖官方文件確認相應 mode 後再設定，否則使用一般目的地連結及中性「導航」。
3. **使車種上下文可見：** 在 carpark marker tooltip／可見圖例與專注模式地圖上顯示目前車種（例如「電單車空位」）；最近查看只標示設施，不要讓高亮被理解成車種空位狀態。車種切換時可保留最近查看 ID，但狀態需明確隨新車種更新。
4. **缺欄位採安全回退：** `motorCycle` vacancy、space 或 rate 缺失時維持未知／未提供，不回退到 privateCar；目前詳情容量與收費的實作已符合此原則，應以測試鎖定。

## 未能由公開資料確認的限制

- 本次官方 API 文件列出 `motorCycle` 作有效車種，但沒有逐一保證所有 carpark 均有該車種的容量、費率或實時空位。應以實際 API 回傳及時間戳確認個別站點，不得由總資料集推定。
- 運輸署公開的路邊電單車泊位頁只指向 HKeMobility；頁面沒有提供其資料介面、開放授權、更新頻率、可機讀欄位或可否取得泊位即時佔用。因此無法確認如何安全地用它替換現有路邊來源。
- `onStreetParking.ts` 讀取官方 CSV 的 `VehicleType`，但本次未能從可抓取的官方說明確認每個 CSV 代碼的完整定義、是否含電單車、以及該資料和「電單車專用泊位」的等價關係；在核實資料字典前不應聲稱資料必然混車種或必然不含電單車。
- Google Maps 對電單車的可用導航模式、香港覆蓋及該 URL 的 `travelmode` 支援，未由本次可取得的官方 Google 文件確認；因此不推測 `driving` 會否產生合法／適用電單車路線。
- 本次只審核指定四個檔案及其必要資料流（另讀取 App、API、domain 與 on-street detail/grouping）；未作瀏覽器實機測試，也未檢查所有資料生成器、部署快照或外部地圖服務執行結果。
