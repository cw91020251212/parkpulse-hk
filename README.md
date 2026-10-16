# 泊邊度｜ParkPulse HK

香港即時停車位地圖，顯示政府停車場空位、充電器、洗手間、油站及 ATM。

## GitHub Pages

GitHub Actions 會在每次推送 `main`、每 6 小時或手動執行時，重新取得公開資料並發佈靜態網站：

- Website: `https://cw91020251212.github.io/parkpulse-hk/`
- Source: `https://github.com/cw91020251212/parkpulse-hk`

GitHub Pages 版本保留停車位（data.gov.hk 即時讀取）、公廁、康文署場館、充電器、油站、ATM 和銀行篩選。公廁／油站／ATM／充電器資料於 GitHub Actions 建置時更新；靜態版只會提供經座標和地點核實的 Google Maps 相片連結。

## 使用教學 / User guide

網站頂部的 **繁／EN** 可切換操作介面語言；站內「使用教學／How to use」會說明定位、地區搜尋、長按地圖、車位狀態、篩選、洗手間／油站／ATM、相片和導航。完整中英文文件見：[使用教學 / How to use](docs/how-to-use.md)。

頁尾的「使用聲明／Disclaimer」說明資料、第三方地圖／相片、定位和瀏覽器偏好的限制；完整中英文文件見：[使用聲明 / Disclaimer](docs/disclaimer.md)。

## 資料來源 / Data sources

接手維護或更新公開資料前，請先看[資料來源與更新索引 / Data source registry](docs/data-source-registry.md)：按功能列出官方網址、程式更新位置、快照檔、刷新命令、精度限制及相應檢查。

## 安裝至手機主畫面

GitHub Pages 版本是一個可安裝的 PWA。Android／Chrome 可在瀏覽器選單選擇「安裝應用程式」或「加到主畫面」；iPhone／iPad 請在 Safari 點擊分享按鈕，選擇「加入主畫面」。安裝後以獨立視窗開啟，並會保留最近讀取的應用外殼與靜態設施資料供短暫離線查看；即時停車空位和地圖仍需要網絡。

## Local development

```bash
pnpm install
pnpm dev
```

Production container is defined in `Dockerfile`. To build the GitHub Pages artifact locally:

```bash
pnpm build:pages
```

The GitHub Pages build uses the `/parkpulse-hk/` path and writes its output to `dist/`.

---

<!-- project-status-and-license-notice -->
## 專案狀態與授權

本專案由個人維護，主要用於個人實驗、學習與測試。部分版本可能公開展示或部署供體驗，但功能、資料及部署可能不完整或變更；請在實際依賴前自行核實，不構成任何第三方背書。

本倉庫的原創程式碼、文件及專案素材只授權個人本機評估與測試；未經著作權人事先書面許可，不得公開鏡像、公開再發佈、散佈或再授權。詳情及第三方材料的範圍見 [`LICENSE`](LICENSE)；第三方程式、資料、圖片、商標及來源材料仍受其各自授權與條款約束。
