# 急症室等候时间：官方资料来源与接入边界

## 已核对的官方资料

| 项目 | 官方来源 | 接入方式 | 本次采用方式 |
|---|---|---|---|
| 等候时间 | 医院管理局「按医院划分的急症室等候时间」 / [DATA.GOV.HK 资料集](https://data.gov.hk/en-data/dataset/hospital-hadata-ae-waiting-time) | `https://www.ha.org.hk/opendata/aed/aedwtdata2-tc.json`（繁中）及 `https://www.ha.org.hk/opendata/aed/aedwtdata2-en.json`（英文） | 浏览器直接读取；响应允许跨域请求，官方约每 15 分钟更新。 |
| 医院地理交叉参考 | [CSDI：按医院划分的急症室等候时间](https://portal.csdi.gov.hk/csdi-webpage/dataset/fhb_rcd_1636947932221_94410) | CSDI 数据集说明含医管局急症室的等候时间及地理资料 | 仅作官方资料交叉参考；不作为前端快照的坐标来源链接。 |
| 地图坐标核对 | 地政总署 [Location Search API](https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-development-location-search-api) 与 [Coordinates Transformation API](https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-coordinates-transformation-api) | 地点搜索返回 HK1980 Grid `x/y`；坐标转换 API 使用 `inSys=hkgrid&outSys=wgsgeog&e=<x>&n=<y>` 输出 WGS84 | 在 Pages 建置时将 18 间医院的官方地图点写入静态位置档；详情分别链接这两项实际使用的地政总署服务，不把它们表述成急症室入口点。 |

## 已验证的资料契约（2026-10-12）

- 医管局繁中和英文 JSON 都有 18 个医院记录，字段包括：`hospName`、`t1wt`、`manageT1case`、`t2wt`、`manageT2case`、`t3p50`、`t3p95`、`t45p50`、`t45p95`。
- 资料更新时间在顶层 `updateTime`；前端须把它清楚显示为**医管局资料更新时间**，不是自行推算的更新时间。
- `t3p50/t3p95` 与 `t45p50/t45p95` 分别为第三类、第四／五类的中位与第 95 百分位等候时间；不可把它们写成个别病人的保证时间。
- 急症、危急个案不应因为等候显示而延误；详情必须写明紧急情况请即致电 999 或前往最近急症室，并以现场分流及医管局指示为准。
- 2026-10-12 01:45（医管局当次资料）18 间的第四／五类中位数为 2.5 小时，仅作资料接线核对，不作为固定显示值；网页会实时读取最新官方数值。

## 呈现决定

1. 在「急症室」模式只显示距离当前中心 2 公里内的医院，沿用应用现有范围规则。
2. 结果标题另列全港 18 间医院的第四／五类中位等候统计，明确标注其资料更新时间和统计类别。
3. Marker 使用原创、透明底的药丸医疗符号；不复制 GeoInfo Map 的素材，也不使用带方形底色的图案。
4. 医院点是官方医院位置；不宣称为急症室门口。导航和详细地址均以医院位置为准。
5. 等候数据直接来自医管局 CORS 公开 JSON，不储存在浏览器长期快取，也不伪装成逐秒实时资料；模式开启时读取，并每 15 分钟自动更新。
