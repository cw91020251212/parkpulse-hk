# 油站／銀行品牌圖標及路邊位漸層

## 完成內容

- 以消委會油站資料的 `brand` 對應 **5 個油站品牌**，並以金管局 ATM 資料的 `brand` 對應 **20 個銀行品牌**。
- 地圖 marker 與結果卡共用同一套本地圖標；油站與 ATM 的品牌名稱仍以文字顯示，圖標不會成為唯一識別方式。
- 新增 `src/data/brand-icons.json` 作單一品牌對照。`scripts/refresh-brand-icons.mjs` 在 Pages 建置時以各品牌官方網站網域的 favicon 快取生成 `public/brand-icons/` 快照；集友銀行使用其官方網站直接提供的標誌資產，因 favicon 快取未提供可用圖標。
- 使用者瀏覽網站時只載入本站 `/brand-icons/` 靜態圖檔，不會向品牌網站、Google favicon 服務或其他第三方圖標服務再發出請求。
- 保留未知品牌的通用油站／ATM 符號，避免資料來源日後新增品牌時令 marker 或結果卡失效。
- 路邊位 marker 的空位、已佔及無資料狀態，改為與停車場相同方向的 `to right` 漸層（因水滴本身旋轉，畫面上為左下深、右上淺），並為中央白色數字加上深色投影；34px 尺寸、白框、尖端、粉紅最近查看輪廓與狀態意義維持不變。

## 覆蓋與來源

目前快照覆蓋 **178 個油站／5 個品牌**及 **1,959 部 ATM／20 個銀行品牌**。品牌對照的官方網域及集友銀行官方圖檔 URL 均記錄於 [`src/data/brand-icons.json`](../src/data/brand-icons.json)。油站品牌來自消費者委員會 [油價資訊通](https://oil-price.consumer.org.hk/tc/station)，ATM 品牌來自香港金融管理局 [ATM Open API](https://api.hkma.gov.hk/public/bank-svf-info/banks-atm-locator?lang=tc)。

## 驗證

- `pnpm test:brand-icons` 確認所有目前資料品牌均有對照及非空本地資產。
- 手機寬度實測：油站模式顯示 21 個本地品牌 marker／卡片，ATM 模式顯示 50 個本地品牌 marker／卡片，所有圖檔 URL 均為 `/brand-icons/`。
- 路邊位模式實測 120 個 marker；空位樣式為青綠漸層，白字子元素含投影。
- `pnpm check`、`pnpm build`、`pnpm build:pages`、`pnpm test:pages`、`pnpm test:pwa` 及 `git diff --check` 全部通過。
