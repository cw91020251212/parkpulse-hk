# 香港賽馬會場外投注處名錄與位置核對

查核日期：2026-10-12

## 官方分店名錄

- 香港賽馬會官方繁體中文場外投注處頁面：<https://entertainment.hkjc.com/zh-hk/visit-us/off-course-experience-shops>
- 繁體中文官方服務時間 PDF：<https://is.hkjc.com/ocb/ocbbizhour_ch.pdf>
- English official service-hours PDF: <https://is.hkjc.com/ocb/ocbbizhour_en.pdf>
- 兩份官方 PDF 的標示日期均為 09/10/2026。本次逐列核對兩份表格各有 83 個投注站，英文／繁中列序一致；分店名稱和完整地址由此官方名錄逐列配對。官方頁亦註明服務時間可能變更而不另行通知，因此 App 只作網點位置搜尋，不顯示即時營業狀態；詳情連回官方來源供使用者查最新服務時間。

## 官方位置及座標轉換

- 地政總署 Location Search API 文件／資料集：<https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-development-location-search-api>
- 地政總署 Coordinates Transformation API 文件／資料集：<https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-coordinates-transformation-api>
- 本次對 83 個官方地址以 Location Search 搜尋；82 個找到 `nameZH = 香港賽馬會` 的分店業務點，並把回傳 HK1980 Grid (x/y) 交由香港測繪處 `https://www.geodetic.gov.hk/transform/v2/` 轉成 WGS84。
- 唯一例外：黃大仙環鳳街，官方地址「鳳凰新邨環鳳街8-10號華頌樓地下」。Location Search 未回傳個別「香港賽馬會」業務點，但回傳「華頌樓」建築位置，HK1980 Grid E 838438 / N 822739，轉換為 WGS84 22.343736138, 114.197939975。此點只代表大廈位置，不代表賽馬會店舖門口；App 必須以灰色／未確認狀態顯示並在詳情明說。查到的 HGC Wi-Fi AP 地址文字提及店舖，不是賽馬會官方位置點，不可拿來宣稱精確投注站座標。

## 範圍與限制

- 這是政府地圖位置搜尋與官方地址名錄的靜態資料，不是賽馬會營業狀態、投注服務可用狀態或實時更新資料。
- 本次 Location Search 由分店完整地址搜尋，按官方名稱 `香港賽馬會` 及地址相似度選擇；所有結果須落在香港 WGS84 範圍。若後續刷新有缺點、地址匹配不清楚、座標轉換失敗或離港，必須停止完整快照更新並列出問題，不能自動選附近大廈作精確位置。
- 維護時先比較繁中及英文 PDF 的分店列數、名稱與地址；對所有地址重新跑官方 Location Search 和座標轉換，人工審閱任何缺點或低匹配，完成回歸後才替換快照。

## 2026-10-12：官方六合彩頭獎「幸運投注處」統計

- 官方繁中頁：<https://special.hkjc.com/e-win/zh-HK/betting-info/marksix/lucky-ocb/>；英文頁：<https://special.hkjc.com/e-win/en-US/betting-info/marksix/lucky-ocb/>。已直接查看官方頁面及中英表格。
- 官方標題為「十大幸運投注處中六合彩頭獎次數統計」，英文為「Top 10 Best-selling 1st Prize Mark Six Tickets OCB Branches」。統計截至 **2026-06-30**；頁下注明為保障中獎者利益，資料於六十天後更新。數字為投注站售出的六合彩頭獎獎券累計次數。
- 目前官方公布十名與累計數：屯門市廣場 48（第1）、中環士丹利街 48（第2）、荃灣青山道 43（第3）、尖沙咀漢口道 41（第4）、上環干諾道西 41（第5）、觀塘廣場 38（第6）、九龍灣德福 36（第7）、大埔廣場 35（第8）、上水石湖墟 35（第9）、大埔廣褔道 30（第10）。
- 官方榜單公布前十名；App 僅為榜內投注站展示皇冠、次數及官方名次，統計項目與榜單名稱保持一致。
- App 應標示官方統計截止日期及來源連結；更新榜單時以官方表格為唯一統計來源並比對投注站名稱，不由新聞、論壇或推測補造其餘分店次數。
