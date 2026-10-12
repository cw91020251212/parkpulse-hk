# 地图中心图钉统一黄色光晕修复

## 问题与原因

GPS 定位图钉带有黄色脉冲光晕，但手动长按地图生成的中心图钉没有发光。原因是光晕伪元素原先只定义在 `.selected-center-marker.is-current-location::before`，而手动图钉只使用 `.selected-center-marker`。

## 修改

- 把黄色脉冲光晕样式移到通用 `.selected-center-marker::before`，因此 GPS 和手动中心图钉都持续显示同一种光晕动画。
- 在图钉本身建立隔离堆叠上下文，确保光晕位于图钉图案后方、仍然可见。
- 保留 GPS 图钉较大的 36×40 尺寸；手动图钉继续使用原有 32×36 尺寸。
- 增加回归断言，防止光晕规则日后又被限定在 GPS 专用样式。

## 验证

- `pnpm run check`
- `pnpm run test:map-viewport`
- `pnpm run test:map-markers`
- `pnpm run test:map-zoom-style`
- `pnpm run build`

以上检查均通过；本地地图页面也已成功渲染。