

## 回歸驗證

- 官方全量產生器檢查到 56 個資料類別、成功讀取 45 份官方 JSON，建立 319 筆 GIHS 去重後的戶外公廁。建置要求最低 35 份可讀檔、250 筆結果，低於門檻時保留舊快照。
- 大埔區本機預覽顯示 18 張洗手間結果卡及 18 個 marker；大埔頭遊樂場僅一筆、距搜尋中心 1.1 公里，並顯示官方地址、開放時間和男／女／暢通易達設施。英文切換顯示 `Tai Po Tau Playground` 等官方英文內容。
- 通過 `pnpm test:lcsd-park-washrooms`、`pnpm test:washroom-icons`、`pnpm test:map-markers`、`pnpm test:map-zoom-style`、`pnpm test:startup-location`、`pnpm check`、`pnpm build`、`pnpm build:pages`、`pnpm test:pages`、`pnpm test:pwa` 和 `git diff --check`。建置產生的其他即時資料快照已還原；只有新公廁快照屬本次功能。

正式 GitHub Pages 部署狀態待提交後確認。
