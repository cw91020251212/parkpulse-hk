# 香港 AED「搵得到」CARE 十八區統計

消防處有官方的「AED 搵得到」平台（CARE，Centralized AED Registry for Emergency）。政府資料一線通提供其繁體中文 CSV API；資料包括 AED 名稱、地址、安裝詳情、緯度、經度、可否供任何人使用及服務時間等。[1] 消防處亦說明，CARE 的 AED 資料由參與部門和機構登記及更新，平台讓市民查看位置、數量與可用時間。[3]

以下是 2026-10-11 從消防處繁體中文 CSV 即時下載的 **4,676 筆 AED 登記紀錄**，以每筆紀錄的經緯度套疊民政事務總署的官方十八區邊界 JSON 所得的統計。[1] [2] 結果中 **4,674 筆**可落入一個十八區邊界；下表的數字是「CARE 登記紀錄數」，不是對全港所有未登記 AED 的普查。

| 地區 | CARE AED 登記紀錄數 |
|---|---:|
| 中西區 | 323 |
| 灣仔區 | 238 |
| 東區 | 258 |
| 南區 | 233 |
| 油尖旺區 | 302 |
| 深水埗區 | 282 |
| 九龍城區 | 227 |
| 黃大仙區 | 209 |
| 觀塘區 | 338 |
| 葵青區 | 302 |
| 荃灣區 | 198 |
| 屯門區 | 263 |
| 元朗區 | 252 |
| 北區 | 167 |
| 大埔區 | 136 |
| 沙田區 | 372 |
| 西貢區 | 278 |
| 離島區 | 296 |
| **十八區合計** | **4,674** |

沙田區最多，有 372 筆；大埔區最少，有 136 筆。資料沒有完全相同的重複列，因此沒有用「去重」方式減少計數。不過，有 470 筆紀錄與其他紀錄共用同一座標，通常反映同一場地或建築內有不同 AED 安裝位置；保留每筆官方登記紀錄較符合平台的資料表達。

另有 2 筆官方紀錄沒有落在民政事務總署的十八區邊界內：深圳灣消防局及深圳灣口岸巴士總站。兩者均位於深圳灣口岸範圍，這次沒有自行歸入元朗區，故列為「十八區外／未歸區」而沒有加進元朗區的 252 筆。

CARE 是官方中央登記平台，但消防處說明其社區覆蓋依賴不同機構主動參與和登記。[3] 因此，這份表應理解為**官方 CARE 已登記、帶有座標的 AED 記錄分布**，不宜聲稱為全港所有實體 AED 的完整總數。

同次分析產出的可重用資料：

- `data-aed-hkfsd-tc.csv`：消防處繁中 AED 原始下載檔，共 4,676 筆。
- `data-had-18-district-boundary.json`：民政事務總署十八區官方邊界檔。
- `data-aed-18-district-counts.csv`：各區統計結果。
- `data-aed-18-district-assignments.csv`：4,674 筆已歸區紀錄及其所屬地區。

## References

[1]: https://data.gov.hk/en-data/dataset/hk-fsd-fsd1-fsdaedapi "Location of Automated External Defibrillator (AED) — Hong Kong Fire Services Department API"
[2]: https://data.gov.hk/en-data/dataset/hk-had-json1-hong-kong-administrative-boundaries "District boundary — Home Affairs Department"
[3]: https://www.hkfsd.gov.hk/eng/education/cep_edu/cep/cep_aaa_index "AED Anywhere for Anyone Programme — Hong Kong Fire Services Department"
