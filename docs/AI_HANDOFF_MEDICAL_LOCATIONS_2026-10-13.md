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
| 医管局专科门诊 | 50 |
| 医管局家庭医学门诊 | 77 |
| 衞生署公务员诊所 | 6 |
| 衞生署公务员转介中心 | 1 |
| 公务员中医诊所 | 3 |
| 香港中医医院公务员指定服务 | 1 |
| **合计** | **182** |

182 条服务记录按坐标合并后为 **134 个地图位置**；其中 **41 个坐标组**含多于一条记录，最多每组 3 条。分类数字描述快照中的地点／服务记录，不等于独立建筑数，也不表示所有服务都能由所有公众或所有公务员使用。

资料口径：

- 「医管局医院／机构」表示机构地点；专科门诊和家庭医学门诊另列。
- 不同服务类别有各自的预约渠道、转介要求及公务员福利名额，详情见记录所附官方来源。
- 这是截至核对日期的地点目录快照；更新时需重新核对临时迁址和新设地点的地址与坐标。

## 主要来源

快照记录保留 `source_url` 与 `source_checked_at`。主要官方来源包括：

- 医管局医院资料：[facility-hosp.json](https://www.ha.org.hk/opendata/facility-hosp.json)
- 医管局专科门诊资料：[facility-sop.json](https://www.ha.org.hk/opendata/facility-sop.json)
- 医管局专科门诊科别与地点：[专科门诊目录](https://www.ha.org.hk/visitor/ha_visitor_index.asp?Content_ID=10053&Lang=CHIB5)；[新症轮候时间](https://www.ha.org.hk/visitor/ha_visitor_index.asp?Content_ID=214197&Lang=CHIB5)
- 医管局「排队易」功能说明：[专科门诊电子化](https://www3.ha.org.hk/ehaslink/issue133/tc/feature-1.html)
- 医管局家庭医学门诊开放数据：[facility-fmc.json](https://www.ha.org.hk/opendata/facility-fmc.json)
- 医管局家庭医学门诊现行名录：[诊所目录](https://www.ha.org.hk/visitor/ha_isf_result.asp?lang=CHIB5&service_code_id=461&service_type=GOPD&location)
- 公务员事务局：[公务员医疗及牙科福利](https://www.csb.gov.hk/tc_chi/admin/benefits/64.html)；[家庭医学诊所公务员筹名单](https://www.csb.gov.hk/tc_chi/admin/benefits/files/Annex_CSB_Homepage.pdf)
- 衞生署：[公务员诊所地点与服务](https://www.dh.gov.hk/tc_chi/clinictimetable/fc.html)
- 公务员事务局：[公务员中医诊所](https://www.csb.gov.hk/tc_chi/cscmc/services/clinics.html)；[预约 App 说明](https://www.csb.gov.hk/tc_chi/cscmc/booking/mobileapp.html)
- 香港中医医院：[地址与交通](https://www.cmhhk.org.hk/en/about_us/contact_us/location_and_transportation/)
- 坐标核实使用地政总署[地点搜索](https://www.map.gov.hk/gs/api/v1.0.0/locationSearch)及[坐标转换服务](https://www.geodetic.gov.hk/transform/v2/)。

## 主要程式文件

- `src/data/eligible-medical-locations.json`：182 条地点快照及来源元数据，含核对后的专科代码。
- `src/domain/medicalLocations.ts`：类别与15项科别目录、官方链接和图标映射。
- `src/components/MedicalLocationCard.tsx`：类别／科别筛选、专科结果卡、HA Go／轮候时间／目录链接。
- `src/components/Filters.tsx`：附近设施模式的「公营医疗」入口。
- `src/components/MapView.tsx`：医疗位置独立图层、共址标记及弹窗科别。
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

本次以 Chromium 检查桌面 1366×768 与手机 390×844：可显示15科筛选，选择精神科后返回3个地点；详情提供 HA Go「排队易」、专科新症轮候时间和科别目录链接。手机页面宽度无横向溢出。


## 2026-10-13 文案精简

应使用者意见，医疗模式现已移除筛选区、详情页和页尾重复的资格／服务免责声明；医疗模式不再显示通用长篇「使用声明」入口。页尾只保留简短的资料更新日期，详情页仍可直接打开对应官方来源。医院／专科记录不再重复塞入通用资格警告；预约区域只显示家庭医学、衞生署、公务员中医及中医医院相关的简明预约事实。

## 2026-10-13 专科科别与排队易

医管局专科门诊名录包含15项服务科别。逐科比对官网结果后，34个有明确服务关联的地点加入 `specialty_codes`；其余未匹配地点显示「官方目录未列出已核对科别」，不会按机构名称猜测。屯门精神健康中心原本不在旧快照，现已补为第50个专科服务地点；地址按医管局服务结果，地图点采用地政总署青山医院C座定位及WGS84坐标转换。

医疗界面现在支持按科别筛选；结果卡和地图点弹窗都显示科别，详情内每个科别可直达对应医管局目录，并提供专科新症轮候时间及 HA Go「排队易」入口。医管局官方资料确认「排队易」可在专科诊症候诊时显示当前轮候；诊症后遥距领取药房筹号及查询药房轮候是另一流程。本次未找到有官方说明、供第三方读取全院即时筹号的公开 API，因此页面链接到 HA Go 官方入口，不读取个人登录资料，也不虚构全院叫号数据。
