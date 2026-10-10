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
