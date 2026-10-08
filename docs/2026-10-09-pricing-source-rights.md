# 停車場收費資料來源與重用權限

日期：2026-10-09

## 可直接整合的來源

DATA.GOV.HK 的「空置車位資訊（整合版）」提供停車場基本資料及收費欄位。DATA.GOV.HK 使用條款明確容許免費瀏覽、下載、分發、複製和連結資料，用於商業及非商業用途；使用時必須清楚註明政府及相關機構為資料來源／知識產權擁有人。網站因此只會自動整合這個官方 API 的收費資料，並在介面標示來源與「以現場告示為準」。

- 資料集／API：https://data.gov.hk/en-data/dataset/hk-dpo-datagovhk1-carpark-info-vacancy/resource/01752c62-a6b6-4ddc-bf2d-25efccadc143
- 運輸署資料集說明：https://data.gov.hk/en-data/dataset/hk-td-tis_5-real-time-parking-vacancy-data
- DATA.GOV.HK 使用條款：https://data.gov.hk/en/terms-and-conditions
- DATA.GOV.HK FAQ：https://data.gov.hk/en/faq

## 只可連結、不可複製的來源

下列官方頁面可作使用者自行核對最新收費的外部連結，但研究中未找到可讓本網站複製、批量擷取或重新發布價格的明確授權；領展及香港國際機場條款更明確限制未經書面許可的重用。因此不會把這些數字寫入 ParkPulse HK 的資料檔。

- 運輸署政府多層停車場：https://www.td.gov.hk/en/transport_in_hong_kong/parking/carparks/；年報費率：https://www.td.gov.hk/mini_site/atd/2025/en/section6-2.html
- 香港國際機場收費：https://www.hongkongairport.com/en/transport/parking/parking-charges.page；條款：https://www.hongkongairport.com/en/terms-of-use.page
- 港珠澳大橋香港口岸：https://www.hzmbparking.com.hk/zh-hk/parking-rates；條款：https://www.hzmbparking.com.hk/zh-hk/terms-of-use
- Wilson／威信：https://www.wilsonparking.com.hk/；集團車場介紹：https://www.wilsongrouphk.com/tc/%E5%81%9C%E8%BB%8A%E5%A0%B4/
- 領展泊車：https://www.linkhk.com/tc/parking/；條款：https://www.linkreit.com/en/terms-of-use-and-disclaimer/
- 帝豪停車場：https://www.impark.com.hk/
- Mack 停車場：https://www.mackcarpark.com.hk/eng/carpark_info.php；免責聲明：https://www.mackcarpark.com.hk/big5/disclaimer.php
- InPark 條款：https://inpark.com.hk/en/terms

## 產品決定

不會估算、混合第三方資料或把日泊／夜泊／月租錯當成時租。介面只把可明確配對到目前車種的政府「每小時／每半小時」規則顯示為卡片時租；詳情會保留同一政府記錄中的原文價目備註，以提供其他合法但不宜自行轉換的收費參考。


## 已完成的網站更新

官方收費解析現會保留 DATA.GOV.HK 結構化的 `hourlyCharges`，並額外辨識同一官方記錄備註內的「每小時／每半小時」格式。解析接受時段放在前面或金額放在前面，以及上一行清楚寫明車種的格式，例如「私家車／客貨車」之後的「$20 每小時」。只會把有清楚車種上下文的價格放入目前車種的卡片基本時租。

詳情的「官方收費資料」新增 DATA.GOV.HK／運輸署來源連結、現場告示優先提示，以及可展開的「查看官方價目備註」。後者保留同一政府記錄中的日泊、夜泊、月租、每季或車種未明的原文價目，讓使用者有參考，但不把它們誤稱作目前車種的時租。營辦商官方網站按鈕保持不變。

以目前提交的政府快照計，583 個官方停車場記錄中，私家車可安全顯示基本時租的記錄由 35 個提升至 73 個；237 個記錄有可於詳情展開查看的官方原文價目備註。數字隨政府資料快照更新而變動。

## 驗證

- `pnpm check`
- `pnpm test:official-pricing`：保留林士街現有時段、確認象山邨的跨行車種上下文可解析、確認戲曲中心未標車種的時租不會錯配給私家車且原文價目仍保留
- `pnpm build`
- `pnpm build:pages`
- `pnpm test:pages`
- `pnpm test:pwa`
- `git diff --check`

GitHub Pages 建置過程中重生的官方快照已還原，避免把與本功能無關的資料更新混入提交。


## 卡片直接顯示

使用者不需要先開啟詳情才看到已有的官方價格。停車場結果卡現在會先顯示可明確配對目前車種的基本時租；若政府記錄有原文價目但不能安全稱為該車種時租，卡片直接顯示「官方價目」和第一條原文，例如「星期一至五（公眾假期除外）：每小時 $28」。這個原文使用可換行的卡片標籤，避免橫向溢出或蓋住導航。完整價目、來源和現場告示優先提示仍保留在詳情。

`tdc17p1`（戲曲中心停車場）檢查確認：私家車沒有被錯配為基本時租，但卡片仍會直接顯示其官方「每小時 $28」原文價目參考。型別檢查、官方收費檢查、一般與 GitHub Pages 建置、Pages／PWA 檢查及 diff 檢查均通過。


320px 手機版量測以最長的雙時段官方價目建立卡片：卡片寬度及捲動寬度同為 294px，價目內容右端 218px，導航按鈕由 229px 開始；沒有橫向溢出或與導航重疊。
