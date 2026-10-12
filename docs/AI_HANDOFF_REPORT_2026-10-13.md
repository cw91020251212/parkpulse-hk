# ParkPulse HK — AI 接手报告

**报告日期：** 2026-10-13（香港时间）  
**仓库：** [`cw91020251212/parkpulse-hk`](https://github.com/cw91020251212/parkpulse-hk)  
**正式网站：** <https://cw91020251212.github.io/parkpulse-hk/>  
**报告目的：** 为后续 AI 编程代理提供可执行、可核查的项目状态与近期改动说明。

> 本报告描述已检查的代码与运行状态。接手时仍须以仓库当前 `main`、最新 CI 和线上页面为准，不要只依赖本报告中的旧资源哈希。

## 1. 当前状态摘要

- `main` 当前为 `fdcaa20`（完整合并提交 `fdcaa2081c4594c86de0ed6faf809fe2e456cbb7`），工作目录干净。
- 本轮相关 PR #1–#5 均已合并；PR #5 的 GitHub Pages 部署工作流 `38294468789` 已成功。
- 已验证正式页面载入停车卡片修正版资源：CSS `assets/index-iqSc4SGk.css`、JavaScript `assets/index-DnJLDFlh.js`（这是本次核查时的哈希；后续部署会变化）。
- 停车卡片的地区、空位、车高、收费、充电及更新时间现在根据内容自然排版；不再依赖彼此重叠的固定高度网格。此次布局修复适用于桌面和手机。
- 未发现本次范围内仍阻断使用的功能问题。卡片变高后清单会更长，这是以可读性换取紧凑度的有意取舍；建议后续根据真实屏幕反馈再做密度优化。

## 2. 已合并改动时间线

| PR | 合并提交 | 内容 | 关键边界 |
|---|---|---|---|
| [#1](https://github.com/cw91020251212/parkpulse-hk/pull/1) | `5f46bb1` | 选择「附近设施」时，移动地图向下延伸一行。 | 停车模式不延伸；逻辑只针对附近设施状态。 |
| [#2](https://github.com/cw91020251212/parkpulse-hk/pull/2) | `36736c0` | 桌面改为左侧控制、右侧全高地图；搜索／图例移到左侧；手机保留堆叠版式。 | 不改停车或设施数据逻辑。 |
| [#3](https://github.com/cw91020251212/parkpulse-hk/pull/3) | `4dee171` | 定位按钮图标改为红色地图针，按钮底色与定位行为保留。 | 仅图标表现。 |
| [#4](https://github.com/cw91020251212/parkpulse-hk/pull/4) | `9ada342` | 桌面左侧控制／结果栏可整体纵向滚动；地图固定在右侧并占满视窗高度；取消桌面结果列表内的小滚动框。 | 手机继续使用原本上下布局。 |
| [#5](https://github.com/cw91020251212/parkpulse-hk/pull/5) | `fdcaa20` | 修复停车结果卡片中地区、空位、车高与充电等文字互相覆盖。 | 内容布局修正适用于桌面和手机，不更改停车数据筛选或业务规则。 |

## 3. 桌面整体版式（PR #2、#4）

### 结构与样式

- `src/App.tsx`：桌面版内容由 `.desktop-layout`、`.desktop-sidebar`、`.desktop-controls` 与 `.workspace` 组织。
- `src/styles.css`：`@media (min-width: 901px)` 下，左侧 `.desktop-sidebar` 使用 `height: 100dvh` 和 `overflow-y: auto`；标题、筛选、地图工具、结果清单和页脚在同一栏中顺序滚动。
- 桌面 `.map-column` 为固定定位，左偏移 `380px`，右侧到窗口边缘，使用 `height: 100dvh`。滚动左栏不应移动地图。
- 桌面 `.results-list` 设为自然高度和 `overflow: visible`；明确进入结果全屏模式时才恢复列表内部滚动。
- `@media (max-width: 900px)` 将 `.desktop-sidebar` 设为 `display: contents`，恢复手机／平板堆叠流程；不要在修桌面时把这些断点规则删掉。

### 已验证行为

在正式网站选取「私家车」后，页面载入 13 项大埔附近结果；桌面侧栏内容高度超过视窗且可滚动，滚动时地图仍固定在 `y=0` 并覆盖完整视窗高度。手机 390×844 检查时，侧栏包装元素不参与布局流（`display: contents`），地图、底部工具和结果区维持上下排列。

## 4. 停车卡片重叠问题（PR #5）

### 用户观察到的现象

停车结果卡片内绿色「N 个空位」覆盖地区（例如「大埔区」）；「车高」、收费和充电等后续资料也挤在一起，难以辨认。该问题在多张连续结果卡片中重复出现。

### 根因（重要，避免回归）

相关文件：

- `src/components/ParkCard.tsx`
- `src/styles.css`

卡片 DOM 顺序为：

1. `.card-heading`（停车场名称、地区、距离）
2. `.availability-line`（空位数和车型）
3. `.card-facts`（总车位、车高、收费方式、充电、无障碍等标签）
4. 可选 `.card-pricing-summary`
5. `.updated`

此前 `.park-card-select` 将这些子项放在固定高度行（例如 `36px 20px 22px 14px`）中。与此同时标题／地区允许最多两行显示，而 `.card-heading` 仍只预留约 36px；距离又被指定到同一网格列，造成网格项目争用。标题区实际高度超过预留值后，后面的空位行仍按固定网格位置绘制，因此会压到地区文字上。`card-facts` 又被限制不换行和隐藏溢出，车高、价钱、充电标签因而出现截断或拥挤。

**不要恢复固定四行高度，也不要只扩大卡片最小高度而保留固定网格行。** 仅提高 `min-height` 不能解决不同标题长度、长标签和定价摘要导致的内容动态变化。

### PR #5 修复策略

在 `src/styles.css` 末段的 `/* Parking cards grow naturally on desktop and mobile so vacancy never covers the district. */` 规则中：

- `.park-card-select` 改为自然高度网格行、顶部排列；
- 停车卡片标题／地区与距离分开，距离另占一行；
- 标题和地区最多显示两行；
- 空位区、车位事实标签可换行且不隐藏溢出；
- 更新行按内容正常出现；
- 同一规则对桌面和手机生效。

### PR #5 实测证据

1. 本地 Chromium 大埔数据检查：旧手机布局中地区与空位行边界有重叠（地区 `bottom=1044`、空位 `top=1033`）；这是复现依据。
2. 修复后手机 Chromium：地区 `bottom=1047`、空位 `top=1087`，相隔约 40 CSS px；事实标签排在空位下方，卡片按内容增高。
3. 修复后桌面 Chromium 检查三张连续停车卡：
   - 卡 1：地区 `490–514`，空位 `554–583`，车高／收费／充电事实 `591–721`，更新时间 `729–750`；
   - 卡 2：地区 `818–842`，空位 `882–912`，事实 `920–987`，官方收费摘要 `995–1026`，更新时间 `1034–1055`；
   - 卡 3：地区 `1124–1148`，空位 `1188–1217`，事实 `1225–1354`，更新时间 `1362–1383`。

各行的垂直边界已分离；长内容会自然换行并使卡片变高。

## 5. 验证命令与结果

在 PR #5 合并前，以下命令均成功：

```bash
pnpm check
pnpm test:map-viewport
pnpm test:nearby-facilities
pnpm build
git diff --check
```

- `pnpm test:nearby-facilities`：验证 178 个油站及 1,956 个 ATM 数据记录。
- 浏览器实测：桌面、390×844 手机视窗；停车结果使用大埔位置，检查卡片行边界和布局。
- GitHub Pages 工作流 `38294468789`：完成并成功。
- 合并后仓库状态为干净的 `main...origin/main`。

## 6. 当前文件定位

| 文件 | 接手时关注内容 |
|---|---|
| `src/App.tsx` | 桌面侧栏／工作区结构，以及 `.park-card` 清单输出位置。 |
| `src/styles.css` | 桌面断点布局（约 1200 行以后）、自然高度停车卡片规则（文件末段）、旧卡片样式和断点覆盖。检查级联顺序，避免旧规则盖掉新规则。 |
| `src/components/ParkCard.tsx` | 名称、地区、距离、空位、车型、车高、收费、充电及更新时间 DOM 顺序。 |
| `scripts/check-map-viewport-scope.mjs` | 地图模式范围、桌面／移动布局、卡片防重叠规则的源码回归断言。 |
| `docs/map-layout-facility-42px.md` | 既有附近设施手机地图延伸设计记录。 |

## 7. 后续 AI 的建议检查清单

- [ ] 从最新 `main` 开始，不要覆盖 PR #1–#5 已合并的行为。
- [ ] 若继续改卡片，至少检查 320、390、768、901、1280+ px 宽度，并查看长停车场名称、有 Google 评分标章、长官方价目、缺少即时数据、无充电数据等组合。
- [ ] 用浏览器视觉检查及 DOM 边界检查双重验证；不能只凭 CSS 推论或 TypeScript 建置通过就宣称不重叠。
- [ ] 验证桌面左侧滚动不带动右侧地图；验证手机仍为地图／工具／结果顺序。
- [ ] 自然换行后停车卡片会较高，这是已知密度取舍。若需要减少滚动，可在未来重新设计资料分组／折叠，不可用重叠或隐藏溢出来压缩高度。
- [ ] 本次构建有 Vite 非阻断提示：主 JavaScript chunk 约 542 kB（minify 后超过 500 kB 建议值）。这不是本次 UI 故障；如要处理，应独立评估 code splitting 并运行完整回归。
- [ ] GitHub Actions 也提示部分 action 的 Node.js 20 运行环境将迁移；这是 workflow 维护事项，不影响 PR #5 部署成功。

## 8. GitHub 交接链接

- 代码仓库：<https://github.com/cw91020251212/parkpulse-hk>
- 正式网站：<https://cw91020251212.github.io/parkpulse-hk/>
- 桌面全高地图与左栏滚动：<https://github.com/cw91020251212/parkpulse-hk/pull/4>
- 停车卡片防重叠：<https://github.com/cw91020251212/parkpulse-hk/pull/5>
- 本报告随当前文档 PR 提交；接手 AI 可直接阅读本 Markdown 与对应 PR 历史。
