# 營辦商官方網址價目稽核

日期：2026-10-09

## 已核實的領展來源

海富停車場的政府記錄 `tdc14p8428`（https://www.linkhk.com/tc/parking/8428）沒有收費欄位，只含高度限制。領展公開資料端點 https://apim-gateway-prd.azure.linkreit.com/MPCMS/PRD2/parking/8428 則回傳一般私家車的官方價目：平日時租 HK$29、六日及公眾假期 HK$31；00:00–06:59 分別 HK$25／HK$27；12 小時 HK$140／HK$150；24 小時 HK$220／HK$230。端點亦提示特別泊車時段進場的時租、12泊及24泊可能全單加收 HK$10，須以入口告示為準。

政府快照有 583 個停車場，其中 258 個帶官方網址。144 個為領展 `linkhk.com/tc/parking/<facilityKey>`，共用上述公開資料結構；批量建置已成功解析 144／144 個一般私家車價目快照。

## 其餘官方網址稽核

其餘 114 個非領展網址已以有限併發讀取並記錄到 `docs/2026-10-09-operator-website-audit.json`：93 個可直接取得頁面，15 個同時出現車場名稱、價錢及時租訊號。高優先網域包括 Wilson（11）、Sino（9）、香港國際機場（7）、港鐵（6）、港珠澳大橋（5）、Mack（5）、西九（5）及利園（5）。這個稽核只用官方網址作來源，不以第三方泊車網站補值。


## 已實作的卡片／詳情價目快照

目前快照包含 183 個一般私家車車場：領展 144 個（逐一由其公開 `parking/<facilityKey>` 端點建置）、信和 9 個（官方 portfolio 內嵌 property JSON，以名稱和 slug 匹配）、以及 30 個經官方共享價目頁逐場對照的港鐵 6 個、香港國際機場 3 個、港珠澳大橋香港口岸 3 個、Mack 5 個、德福 3 個、利園 5 個及西九 5 個。

每筆快照保留營辦商官方連結、建置核對日期、繁中和英文卡片摘要及完整原文／條件；前端用 `park_Id` 合併至政府基本資料，並把本地資料快取升級至 `parkspot:info:v2`，令舊快取不會遮住新價目。`scripts/check-operator-rates.mjs` 要求 183／183 筆完整快照，並核對海富、港利中心、香港站及西閘的實際官方價目。

尚未輸出到卡片的官方網址並非被略過：稽核 JSON 保留其網域、讀取狀態、名稱匹配和價錢訊號；Wilson、房委會及其他動態／共享來源會按車場 ID、地址和原頁區段建立下一批適配器，不能把共享頁未能定位的金額猜配到錯誤停車場。


### 已採用官方來源網址

領展：`https://apim-gateway-prd.azure.linkreit.com/MPCMS/PRD2/parking/<facilityKey>`；信和：`https://www.sino-propertyservices.com/tc/parking-services/portfolio`；港鐵：`https://www.mtr.com.hk/ch/customer/services/stations_carpark.html`；香港國際機場：`https://www.hongkongairport.com/en/transport/parking/parking-charges.page`；港珠澳大橋香港口岸：`https://www.hzmbparking.com.hk/zh-hk/parking-rates`；Mack：`https://www.mackcarpark.com.hk/big5/pricelist.php`；德福廣場：`https://www.telford-plaza.com/tch/parking`；利園：`https://www.leegardens.com.hk/car-park-promotion.aspx?lang=zh-HK`；西九：`https://www.westk.hk/tc/parking`。


## 卡片直接顯示修正

長營辦商價目原本與總車位、車高共用單一 `card-facts` 行，會被既有手機單行裁切規則遮住。現改成卡片內獨立的 `card-pricing-summary` 資料列：資料列在車高／總數下方、更新時間上方，容許自然換行並讓卡片隨內容增高；短的政府基本時租則仍留在原本 facts 行。

以 320 px 繁中實測海富停車場，`領展官方：平日每小時 HK$29；六、日及公眾假期每小時 HK$31` 的 `scrollHeight` 與 `clientHeight` 均為 31 px，資料列完全位於卡片邊界內，卡片高度 178.78 px。切換英文後，`Link official: Weekday: HK$29/hr; Weekend and public holidays: HK$31/hr` 同樣沒有溢出或裁切。
