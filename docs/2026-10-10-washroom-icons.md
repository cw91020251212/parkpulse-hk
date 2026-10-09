# 洗手间图标重制

**日期：** 2026-10-10

地图原先用平台彩色 emoji 表示两种洗手间：食环署公厕是 `🚻`，康文署场馆洗手间是 `🏟️`。两者的笔画、颜色和视觉重量均不统一，场馆符号也不直接表达洗手间。

本次改为一套自置白色 2px 圆角线条图标：

- **食环署公厕**：双厕格门，表达独立公共厕所。
- **康文署场馆洗手间**：洗手盆，表达场馆内洗手间。

公厕保留蓝色、场馆保留紫色 marker 和卡片底色；图标只有白色线条，marker 与卡片使用同一图形。Leaflet marker 内图标会按水滴 marker 的旋转反向校正，卡片保持直立。未加入外部图片、字体或依赖。

## 验证

- 本机洗手间模式有 31 个地图 marker 与 31 张卡片，均显示新的 SVG 图标；两种类别都出现，旧 `🚻`／`🏟️` emoji 数量为 0。
- `pnpm test:washroom-icons`、`pnpm test:map-markers`、`pnpm test:map-zoom-style`、`pnpm test:startup-location`、`pnpm check`、`pnpm build`、`pnpm build:pages`、`pnpm test:pages`、`pnpm test:pwa` 及 `git diff --check` 已通过。
