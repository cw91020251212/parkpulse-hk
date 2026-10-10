# 指定洗手间图案与设施渐变

**日期：** 2026-10-10

用户指定两款图案：橙色运动图案代表康文署场馆洗手间，红蓝男女图案代表所有公共厕所。本次保留用户提供的场馆图案，并把公共厕所图案的外缘白色空白转成透明后裁去空白边缘；图形的红、蓝和黑色细节不变，以便小尺寸仍可辨认。

`WashroomSymbol` 现同时供结果卡和 Leaflet 水滴 marker 使用同一对静态资源：

- `venue-sport.png`：康文署场馆洗手间。
- `public-toilet-gender.png`：食环署公共厕所。

公厕、场馆、油站和 ATM 的 marker、卡片小图标及图例统一使用 `linear-gradient(to top right, 深色, 浅色)`，即**左下深色、右上浅色**。带银行／油站品牌的 marker 继续显示品牌小图，但外层水滴保持相应颜色渐变；路边位、停车场、中心 `📍`、轮廓与投影没有改动。

## 验证

- 本机洗手间模式：31 个 marker 与 31 张卡均正确载入用户指定图案；场馆与公厕两种图案均出现，marker 尺寸保持 20px 内，卡片图标尺寸保持 22px 内。
- 本机 ATM 模式：50 个 marker／50 张卡的 outer marker 和卡片图标都实际计算为左下深、右上浅的绿色渐变，带品牌的 ATM marker 亦保持渐变。
- `pnpm test:washroom-icons`、`pnpm test:map-markers`、`pnpm test:map-zoom-style`、`pnpm test:startup-location`、`pnpm check`、`pnpm build`、`pnpm build:pages`、`pnpm test:pages`、`pnpm test:pwa` 及 `git diff --check` 已通过。

## Pages 子路徑修正（2026-10-10）

正式站位於 `/parkpulse-hk/`，之前圖案卻引用 `/facility-icons/...`，所以 GitHub Pages 根路徑回傳 404；正確的 `/parkpulse-hk/facility-icons/...` 回傳 200。本機 `/` 下測試未能發現此差異。現改由 `import.meta.env.BASE_URL` 組合兩個圖案網址，並擴充 `pnpm test:washroom-icons` 防止再退回根目錄路徑。漸變 CSS 已核對仍採左下深、右上淺，不需更改。

部署提交 `628ee19` 的 Pages workflow `38022419686` 已成功。正式瀏覽器確認 16 個場館圖案及 46 個公廁圖案全部載入（`failed=0`；原始圖片寬度 1200／508），兩款正式資源 HTTP 200；水滴與卡片的計算漸變仍為 `to top right`。


## 設施底色調亮（2026-10-10）

依用戶回饋，公廁、場館洗手間、油站與 ATM 水滴、卡片圖標及圖例的底色整體改為較淺柔和漸層；仍維持左下深、右上淺與各類別色相差異。公廁藍 `#4d9bbf→#b8e3f2`、場館紫 `#8f74b8→#e0d2f6`、油站橙 `#c87835→#f8d8ac`、ATM 綠 `#4b9e7c→#c3ebd7`。品牌圖與指定圖片、外框、投影保持原樣。

Pages workflow `38023130751` 已成功。正式站瀏覽器核實水滴、卡片、圖例四類計算樣式皆為新色；16 個場館圖案及 46 個公廁圖案 `failed=0`，兩個圖片資源皆 HTTP 200。


## 洗手間底色再次調淺（2026-10-10）

依用戶追加回饋，公廁改為淡藍 `#a8d6e8→#eef9fd`，場館洗手間改為淡紫 `#cbbbe2→#f5f0fb`，套用在 marker、卡片及圖例；油站／ATM 配色不變。

Pages workflow `38024333990` 已成功。正式站計算樣式確認水滴、卡片、圖例均使用新色；16 個場館圖案和 46 個公廁圖案 `failed=0`。上述回歸檢查及 Pages／PWA 建置均通過。
