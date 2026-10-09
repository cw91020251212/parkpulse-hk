# 大埔超級城渣打 ATM marker 重疊修正

日期：2026-10-09

## 問題與核實

使用者回報大埔中心的渣打 ATM 未在地圖出現。調查確認資料並沒有遺漏：官方快照及正式 GitHub Pages 的 `pages-data/atms.json` 已含 `atm-1826`，資料如下：

- **渣打銀行（香港）有限公司**
- 新界大埔大埔超級城 A 區 2 樓 OS-1 號位
- 座標：22.451509, 114.170194
- 24 小時；金管局 ATM 資料

渣打官方定位器及大埔超級城官方商場頁同樣列出此 ATM（A 區 L2 OS1、24 小時）。問題根因是中銀 `atm-1825` 位於大埔超級城 D 區一樓，與渣打相距只有 **6.8 米**；在目前地圖縮放下兩枚 34px brand marker 疊在一起，後顯示的 logo 覆蓋另一枚。

## 修正

`MapView` 只對 ATM 採用小型、固定的螢幕偏移：同一 25 米群組按穩定 ID 配給左右／上下位置。這只改 marker 的視覺位置，不改任何官方經緯度、2 公里判定、卡片距離、Popup、導航座標或資料來源。油站、洗手間、路邊位及停車場 marker 維持原位。

因此，大埔超級城的中銀與渣打 logo 可同時看見及分別點按；渣打仍代表其官方 A 區 L2 OS1 實際位置。

## 來源

- [金管局 ATM 公開資料集](https://api.hkma.gov.hk/public/bank-svf-info/banks-atm-locator?lang=tc)
- [渣打香港 ATM／分行定位器](https://www.sc.com/hk/atm-branch-locator/)
- [大埔超級城：渣打銀行櫃員機](https://taipomegamall.shkp.com/shops/%E6%B8%A3%E6%89%93%E9%8A%80%E8%A1%8C%E6%AB%83%E5%93%A1%E6%A9%9F/)

## 驗證

- `pnpm test:atm-marker-overlap` 驗證 `atm-1826` 和 `atm-1825` 均存在、渣打地址屬大埔超級城，且兩者距離 6.8 米（小於 25 米）。
- 390px 瀏覽器 DOM 實測：中銀 marker 取得 `translate: -14px`，渣打 marker 取得 `translate: 14px`；中心相距 29px，均保留獨立的本地品牌圖檔。
- 待完成完整一般／Pages 建置與 PWA 檢查後提交部署。

## 最終建置驗證

`pnpm check`、`pnpm build`、`pnpm build:pages`、`pnpm test:atm-marker-overlap`、`pnpm test:pages`、`pnpm test:pwa` 及 `git diff --check` 均已通過。Pages 輸出仍含 1,959 個 ATM 記錄，並保留既有 PWA、2 公里範圍與所有政府資料快照檢查。
