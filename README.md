# ParkPulse HK｜泊邊有位

香港即時停車位地圖，顯示政府停車場空位、充電器、洗手間、油站及 ATM。

## GitHub Pages

GitHub Actions 會在每次推送 `main`、每 6 小時或手動執行時，重新取得公開資料並發佈靜態網站：

- Website: `https://cw91020251212.github.io/parkpulse-hk/`
- Source: `https://github.com/cw91020251212/parkpulse-hk`

GitHub Pages 版本保留停車位（data.gov.hk 即時讀取）、公廁、康文署場館、充電器、油站、ATM 和銀行篩選。公廁／油站／ATM／充電器資料於 GitHub Actions 建置時更新；靜態版只會提供經座標和地點核實的 Google Maps 相片連結。

## 使用教學 / User guide

網站頂部的 **繁／EN** 可切換操作介面語言；站內「使用教學／How to use」會說明定位、地區搜尋、長按地圖、車位狀態、篩選、洗手間／油站／ATM、相片和導航。完整中英文文件見：[使用教學 / How to use](docs/how-to-use.md)。

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
