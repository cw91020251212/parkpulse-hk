# 油站與 ATM 資料來源研究

## 油站

消費者委員會「油價資訊通」油站搜尋：https://oil-price.consumer.org.hk/tc/station

2026-10-08 實測頁面標示「所有油站（178個）」；其伺服器回傳的 HTML 已包含每個油站的中文名稱、地址、公司標誌 alt、Google Maps 導航座標與油種／服務資料。例：列表項目的導航 URL 使用 `destination=latitude,longitude`。來源由消費者委員會維護，涵蓋中石化、中國石油、加德士、埃索、蜆殼及專用石油氣站。建議由既有 Express 同源端點擷取並快取，不讓瀏覽器跨域抓取；標示「消費者委員會油價資訊通」，不可把資料描述成政府油站登記冊。

## ATM

香港金融管理局 DATA.GOV.HK 資料集：https://data.gov.hk/en-data/dataset/hk-hkma-bankbranch-banks-atm-locator

API：https://api.hkma.gov.hk/public/bank-svf-info/banks-atm-locator?lang=en

資料集說明為「Information of Automated Teller Machines of retail banks」，更新頻率為 as and when necessary，並提供 JSON/API 與空間資料記錄。這是 ATM 的權威來源；下一步需檢查回傳欄位是否已有 WGS84 座標，若只提供地址，則以政府地址查詢服務補充座標並以快取／靜態快照處理。不能以 Google Maps 泛搜取代此官方來源。
