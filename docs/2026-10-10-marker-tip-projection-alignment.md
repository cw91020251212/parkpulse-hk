# 水滴 Marker 尖端与投影对齐

**日期：** 2026-10-10

用户指出投影错误地凸到水滴尖端上方。根因是 Leaflet 的停车场和设施 marker 分别使用 38px 与 34px 的外壳，但水滴本体经 45 度旋转后，其视觉尖端会超出外壳底边；先前共用 `bottom: -5px` 的投影仍留在本体下半部。

本机实际量度：停车场水滴视觉边界高 53.74px，尖端比 38px shell 底部低约 7.87px；设施水滴视觉边界高 48.08px，尖端比 34px shell 底部低约 7.04px。因此投影分开处理：停车场为 `30×7px`、`left: 4px`、`bottom: -16px`；设施为 `28×6px`、`left: 3px`、`bottom: -14px`。两者的投影上边均在实际尖端下方约 1px。

投影继续是灰色 34% 透明的水平硬边椭圆；不使用 transform、blur、filter 或 box-shadow，不改 marker anchor、资料、筛选或互动。

## 验证

- 本机浏览器计算后的停车场尖端在 `642.87px`，投影上边在 `644px`，低 1.13px；设施尖端在 `657.04px`，投影上边在 `658px`，低 0.96px。两种投影均为 `transform: none`。
- `pnpm test:map-zoom-style`、`pnpm test:map-markers`、`pnpm test:startup-location`、`pnpm check`、`pnpm build`、`pnpm build:pages`、`pnpm test:pages`、`pnpm test:pwa` 及 `git diff --check` 全部通过。
