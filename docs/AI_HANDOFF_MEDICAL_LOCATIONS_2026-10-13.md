# AI 交接：公营医疗地点模式（2026-10-13）

## 目标与目前实现

使用者要求把经核实的香港公营医疗／公务员医疗福利相关地点加入 ParkPulse HK，并放到合适位置。新入口位于：

> **附近设施 → 公营医疗**

数据采用版本化静态快照，不会在每次打开网页时向医疗服务端查询。结果会按当前搜索范围（公里半径或地图可视范围）筛选；侧栏提供类别筛选、地点卡片、步行导航、电话／预约说明、官方来源和详情。

医疗图层与原有停车及其他附近设施图层分开。医疗记录不会并入停车结果或现有普通附近设施数据数组。同一 GPS 坐标的多个服务会合并为一个地图标记；点开后逐项选择服务详情。混合类别共址使用独立图标。

## 数据快照口径

数据源：`src/data/eligible-medical-locations.json`；记录核对日期：**2026-10-13**。

| 分类 | 记录数 |
| --- | ---: |
| 医管局医院／机构位置 | 44 |
| 医管局专科门诊 | 49 |
| 医管局家庭医学门诊 | 77 |
| 衞生署公务员诊所 | 6 |
| 衞生署公务员转介中心 | 1 |
| 公务员中医诊所 | 3 |
| 香港中医医院公务员指定服务 | 1 |
| **合计** | **181** |

181 条服务记录按坐标合并后为 **133 个地图位置**；其中 **41 个坐标组**含多于一条记录，最多每组 3 条。分类数字描述快照中的地点／服务记录，不等于独立建筑数，也不表示所有服务都能由所有公众或所有公务员使用。

特别注意：

- 「医管局医院／机构」类别表示机构位置，**不保证该坐标就是门诊入口或该处必有门诊**。
- 公务员医疗福利有资格、转介、服务范围、预约渠道和名额限制。普通家庭医学门诊、专科门诊、公务员专属诊所、中医服务不可互相视为同一资格。
- 数据是地点目录快照，**不是实时门诊开放、轮候、预约配额或资格判定**。联系机构核实后才预约。
- 两个临时搬迁地址及新设地点以当时官方目录／地址服务为准；更新快照时必须复核当前地址与坐标，不能盲目沿用旧坐标。

## 主要来源

快照记录保留 `source_url` 与 `source_checked_at`。主要官方来源包括：

- 医管局医院资料：[facility-hosp.json](https://www.ha.org.hk/opendata/facility-hosp.json)
- 医管局专科门诊资料：[facility-sop.json](https://www.ha.org.hk/opendata/facility-sop.json)
- 医管局家庭医学门诊开放数据：[facility-fmc.json](https://www.ha.org.hk/opendata/facility-fmc.json)
- 医管局家庭医学门诊现行名录：[诊所目录](https://www.ha.org.hk/visitor/ha_isf_result.asp?lang=CHIB5&service_code_id=461&service_type=GOPD&location)
- 公务员事务局：[公务员医疗及牙科福利](https://www.csb.gov.hk/tc_chi/admin/benefits/64.html)；[家庭医学诊所公务员筹名单](https://www.csb.gov.hk/tc_chi/admin/benefits/files/Annex_CSB_Homepage.pdf)
- 衞生署：[公务员诊所地点与服务](https://www.dh.gov.hk/tc_chi/clinictimetable/fc.html)
- 公务员事务局：[公务员中医诊所](https://www.csb.gov.hk/tc_chi/cscmc/services/clinics.html)；[预约 App 说明](https://www.csb.gov.hk/tc_chi/cscmc/booking/mobileapp.html)
- 香港中医医院：[地址与交通](https://www.cmhhk.org.hk/en/about_us/contact_us/location_and_transportation/)
- 坐标核实使用地政总署[地点搜索](https://www.map.gov.hk/gs/api/v1.0.0/locationSearch)及[坐标转换服务](https://www.geodetic.gov.hk/transform/v2/)。

## 主要程式文件

- `src/data/eligible-medical-locations.json`：181 条地点快照及来源元数据。
- `src/domain/medicalLocations.ts`：分类顺序、文案映射、图标映射、坐标分组键。
- `src/components/MedicalLocationCard.tsx`：分类筛选、结果卡、详情、预约／电话／导航和来源链接。
- `src/components/Filters.tsx`：附近设施模式的「公营医疗」入口。
- `src/components/MapView.tsx`：医疗位置独立地图图层及共址标记。
- `src/App.tsx`：范围过滤、类别统计、结果列表、详情选择与图例接线。
- `public/icons/medical/*.svg`：单色类别图标，供地图标记和类别筛选重用。
- `scripts/check-medical-locations.mjs`：数量、类别、坐标、来源、图标和图层隔离测试。

## 验证命令

```bash
pnpm check
pnpm test:medical-locations
pnpm test:map-viewport
pnpm test:map-markers
pnpm test:nearby-facilities
pnpm build
pnpm build:pages
```

本次实际以 Chromium 检查桌面 1366×768、手机 390×844：医疗模式切换、51 条可视范围结果、家庭医学类别筛选（22 条）、详情官方来源和导航链接；桌面地图为全高，手机页面宽度无横向溢出。构建成功；Vite 仍会提示应用主 JS chunk 超过 500 kB（压缩后约 189 kB），此为性能优化提示而非构建失败。
