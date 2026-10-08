# 2026-10-08｜GitHub Pages 相片連結

## 問題

GitHub Pages 是純靜態網站，不能安全使用原本伺服器端的 Google Maps 相片代理。因此先前的「相片」操作只會顯示相片暫不可用，使用者不能直接前往相片來源。

## 修正

- 靜態版的每張食環署公廁及康文署場館洗手間卡，將「相片」改為 **「地圖相片 ↗」** 連結；一按即在新分頁開啟以官方名稱及地址組成的 Google Maps 地點搜尋頁。
- 靜態版的停車場詳情「附近實景」改為清楚標示 **Google Maps**，並提供「開啟 Google Maps 相片 ↗」連結。
- 相片連結有明確的無障礙標籤，說明會開啟 Google Maps 的對應地點相片。
- GitHub Pages 不發出 `/api/place-photo` 請求、不嵌入私密服務憑證，亦不把外部 Google Maps 結果冒充為位置核實的相片。
- 原有伺服器版保留已核實相片的嚴格 250 米座標檢查、圖片、距離、歸屬和更多相片連結。

## 驗證

- `pnpm check`、`pnpm test:photos`、一般正式建置、`pnpm build:pages`、`pnpm test:pages` 和 `git diff --check` 均已通過。
- 靜態版實測洗手間模式顯示 31 個「地圖相片 ↗」連結；第一個連結指向 Google Maps 搜尋 URL、使用新分頁，瀏覽器資源記錄中沒有 `/api/place-photo` 請求。
- GitHub Actions workflow `37779411257` 已於 2026-10-08 成功 build 及 deploy；正式網站已回傳新 bundle，瀏覽器實測顯示「地圖相片 ↗」和 Google Maps 無障礙標籤。
