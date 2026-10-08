# 2026-10-08｜GitHub Pages 自主管理發佈

正式靜態網站由 GitHub Pages 發佈：

- URL：`https://cw91020251212.github.io/parkpulse-hk/`
- repository：`https://github.com/cw91020251212/parkpulse-hk`
- workflow：`.github/workflows/deploy-pages.yml`

GitHub Actions 在每次 `main` 更新、手動執行及每 6 小時建置。它會取得食環署、環保署、消委會和金管局／ArcGIS 後備的公開資料，產生靜態資料檔後再部署；即時停車空位由瀏覽器直接使用 CORS 開放的 data.gov.hk API。

GitHub Pages 是純靜態網站，因此不能使用需私密憑證的 Google Maps 相片代理；卡片仍保留 Google Maps 連結。日後若要恢復已核實相片，需接駁使用者自管後端。