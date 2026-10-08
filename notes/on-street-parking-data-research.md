# 香港路邊泊位與咪錶資料研究

研究日期：2026-10-09

## 結論

運輸署有兩套可直接使用的官方資料，並不是第三方估算：

1. **咪錶泊車位**：全港咪錶位置與已裝新智能咪錶泊位的實時使用狀態。
2. **非咪錶路旁泊位**：只限已裝感應器的試行位置，並非所有普通路邊泊位。

## 官方資料來源

| 類別 | 位置資料 | 使用狀態 | 即時程度與限制 |
| --- | --- | --- | --- |
| 咪錶泊車位 | `https://resource.data.one.gov.hk/td/psiparkingspaces/spaceinfo/parkingspaces.csv` | `https://resource.data.one.gov.hk/td/psiparkingspaces/occupancystatus/occupancystatus.csv` | 資料集標示由每分鐘至每日；檔案回應的共享快取為 60 秒。位置檔有全港咪錶位；狀態只適用於已裝新智能咪錶的泊位。兩個網址提供 CORS。 |
| 非咪錶路旁泊位試行 | `https://data.nmospiot.gov.hk/api/pvds/Download/parkingspace` | `https://data.nmospiot.gov.hk/api/pvds/Download/occupancystatus` | 運輸署說明為約 250 個試行感應器位置；2026-10-09 實測檔案為 146 個位置、145 個狀態。來源沒有 CORS 回應標頭，純 GitHub Pages 不能直接以瀏覽器即時讀取。 |

資料集頁面：

- [咪錶泊車位分佈及使用情況](https://data.gov.hk/tc-data/dataset/hk-td-msd_1-metered-parking-spaces-data)
- [感應器非咪錶路旁泊車位](https://data.gov.hk/tc-data/dataset/hk-td-msd_2-non-metered-parking-spaces-data)
- [運輸署新咪錶介紹](https://www.td.gov.hk/tc/transport_in_hong_kong/parking/parking_meters/npm/index.html)

## 已核實欄位與狀態

### 咪錶

位置檔包括中文道路／路段、緯經度、車種、有效時段、每次停車限制與收費單位。狀態檔的 `OccupancyStatus`：

- `V`：有位（Vacant）
- `O`：已被使用（Occupied）

`ParkingMeterStatus`：

- `N`：正常（Normal）
- `NU`：不可使用（Not for Use）

2026-10-09 實測：20,748 個位置、20,704 個實時狀態；其中 4,910 個 `V`、15,794 個 `O`，另有 44 個位置暫未有實時狀態。

### 非咪錶路旁泊位

`OccupancyStatus`：

- `V`：有位
- `O`：已被使用
- `NU`：不可使用

2026-10-09 實測：145 個狀態，其中 52 個 `V`、15 個 `O`、78 個 `NU`。

## 產品建議

最穩妥做法是先加入最後一個互斥「路邊位」控制：

- 地圖／清單預設只顯示有實時狀態的智能咪錶泊位與已裝感應器的非咪錶試行位。
- 清楚標示來源：`咪錶`、`路旁感應試行`，不把所有路邊空間誤說成有實時資料。
- 顯示道路、路段、車種、狀態、最後狀態變更時間；咪錶額外顯示官方收費單位與有效時段。
- 保持 60 秒更新；沒有實時資料的普通咪錶位置應預設不顯示，日後可另加「只看位置」選項。

智能咪錶的付款二維碼屬現場收費錶展示的動態 QR；公開位置／狀態資料沒有可直接拿來付款的 QR。因此網站可提供導航與「到達後掃咪錶付款」提示，但不應偽造掃碼付款功能。運輸署指出可在現場掃咪錶的動態 QR 使用「入錶易」付款。

## GitHub Pages 限制

咪錶兩個官方 CSV 具有 CORS，可由 GitHub Pages 前端每 60 秒直接讀取。非咪錶試行資料來源目前沒有 CORS，若要求該部分也完全即時，需要自管／伺服器代理或找出 CORS 可用的官方空間 API；單靠 GitHub Pages 的定期建置只能提供快照，不能誠實地宣稱即時。
