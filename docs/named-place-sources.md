# 地名與場地範圍資料來源

## 原始政府資料

採用地政總署 iG1000 Geo-Reference Database，包含命名場地、子場地、建築物幾何及關聯地址。官方來源：

- [產品說明](https://www.landsd.gov.hk/en/survey-mapping/mapping/other-products/geo-reference-database.html)
- [官方資料字典](https://www.landsd.gov.hk/doc/en/mapping/digital-map/common/feature/ig1_mf.pdf)
- [DATA.GOV.HK](https://data.gov.hk/en-data/dataset/hk-landsd-openmap-development-hkms-digital-g1k)
- [CSDI](https://portal.csdi.gov.hk/csdi-webpage/dataset/landsd_rcd_1637226341468_86480)

地政總署 iG1000 的 CSDI WFS 這次實測只提供 TileIndex，不能把它冒充命名场界；真正資料可由官方 HKMS 完整 FGDB 取得。

## 今次資料取得途徑

本版本從 [open-data.hk 公開 CSDI 鏡像](https://open-data.hk/csdi-datasets/landsd_rcd_1637226341468_86480) 下載原政府資料。該站 [來源說明](https://open-data.hk/about) 明確寫明定期自 CSDI 下載，不保證最新；本版本不會稱作即時反查，也不會省略鏡像來源。資料版本及取得網址保存在JSON，資訊窗來源標為「地政總署／CSDI（鏡像快照）」，展開資料可看 open-data.hk。

[公開 API 文件](https://open-data.hk/csdi-datasets/landsd_rcd_1637226341468_86480/api/docs) 指定 PostgREST API `https://pgrst.open-data.hk`，schema `csdi_landsd_rcd_1637226341468_86480`。只作建置時公開資料讀取，不在手機呼叫鏡像、不傳GPS。以 `Prefer:count=exact`、`Content-Range`、objectid 排序、穩定總數及唯一ID驗證全表下載完整性。

表及關聯：

- `sitepolygonandsitename`：siteid、sitecode、englishsitename、chinesesitename、shape；以 siteid 關聯 `siteandsiteaddress`。
- `subsitepolygonandsubsitename`：subsiteid、siteid、sitecode、englishsitename、chinesesitename、shape；以 subsiteid 關聯 `subsiteandsubsiteaddress`。
- `buildingandbuildingname`：buildingid、sitecode、englishbuildingname、chinesebuildingname、shape；以 buildingid 關聯 `buildingandbuildingaddress`。沒有獨立地址而只有共同sitecode的場地地址時，只採同一sitecode地址，不把附近門牌拼入。
- 地址保留官方 `addresstype=O` 街道記錄的號碼前後綴、號碼範圍及中英街道名；沒有官方地址欄位不虛構門牌。

今次正式快照完整下載site、subsite及兩張關聯地址表，保留所有有名的場界；獨立building全表及其132,920筆地址未納入本版本，以上building欄位只是後續資料規格，不是現有覆蓋承諾。沒有命名場地覆蓋的點仍提供座標，不能稱作「任何一點都有地址」。

2026-11-03成功生成：13,502個site、185個subsite、6,921筆site地址、117筆subsite地址；有名範圍共11,459個。無中英文名稱的原始範圍不加入命名索引，沒有從其他資料推測名稱。快照取得時間`2026-11-02T23:01:17.642Z`；原表最新一筆更新日期為2026-09-25，個別場地保留其自己的`updatedAt`。香港大球場`site-1503015648`的官方街道地址為「東院道55號／55 EASTERN HOSPITAL ROAD」，該筆日期2025-06-24。大球場中央與大埔運動場均已通過真實資料回歸。

2026-11-03重新量測：`limit=100`回100筆；地址請求`limit=400&offset=400`仍只回`Content-Range:400-499/6921`的100筆。官方PostgREST[分頁文件](https://docs.postgrest.org/en/v16/references/api/pagination_count.html)也明示伺服器可少回行數。因此建置依實際行數和Content-Range前進、最多兩個請求，有120秒單頁上限及最多兩次暫態重試；不是以請求limit推算偏移。可選建置暫存不發布到網站；Pages只重用24小時內已生成的完整快照，原取得時間不改，之後刷新失敗保留上一版。

原幾何为 EPSG:2326 HK1980；以 [EPSG:1825 轉換](https://epsg.io/2326) 轉 WGS84，保留 Polygon/MultiPolygon 孔洞及七位小數。前端依原場界本機判斷包含；最近場地只標「附近」，不把附近點當所在地。

## 官方壓縮包下載核查

官方附件網址 `https://www.hkmapservice.gov.hk/OpenData/directDownload?productName=iG1000&sheetName=Fullset_Seamless&productFormat=FGDB` 可提供HTTP200。CLI原先因伺服器中繼憑證鏈不完整失敗；補入由證書AIA指定的香港郵政官方 `http://www1.eCert.gov.hk/root/ecert_ssl_ca_3-17.crt` 後，OpenSSL鏈驗證通過、官方下載可正常串流。未完成的ZIP自然沒有末端目錄，不能因此說原始資料不存在或是官方已知Bug；本次串流較慢，為完成原要求，使用以上可追溯政府資料鏡像而非等全套大包。沒有停用TLS驗證、沒有複製網站key、沒有偽造Origin，也沒有轉用受限制的 GeoInfo Map identify 接口。
