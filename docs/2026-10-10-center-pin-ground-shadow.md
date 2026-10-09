# 中心大头针贴地投影

**日期：** 2026-10-10

中心 `📍` 是 2 公里搜索中心的大头针，和停车场／设施水滴不同：它的针尖必须接触地图。修正前它只有 `drop-shadow(0 3px 4px …)`，会造成漂浮感，也没有独立地面投影。

浏览器量度显示中心 pin 和其 32×36px Leaflet shell 的底边同在 `652px`，即 `iconAnchor: [16, 36]` 所代表的地图接触点。修正后移除本体 `drop-shadow`，在 shell 放置 16×4px、`left: 8px`、`bottom: -4px` 的灰色 34% 透明硬边椭圆；椭圆上边刚好在 `652px`，直接接触针尖。

## 验证

- 本机浏览器计算结果：pin 底边 `652px`、投影上边 `652px`、间距 `0px`；pin 和投影均为 `filter: none`、`box-shadow: none`、`transform: none`。
- `pnpm test:map-zoom-style`、`pnpm test:map-markers`、`pnpm test:startup-location`、`pnpm check`、`pnpm build`、`pnpm build:pages`、`pnpm test:pages`、`pnpm test:pwa` 及 `git diff --check` 全部通过。
