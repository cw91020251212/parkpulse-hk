# 運輸署交通快拍：拍攝方向資料與相片優先詳情

**結論：運輸署公開資料沒有逐鏡頭的拍攝朝向角度、視野方向或視野範圍。因此目前不應在地圖畫方向箭嘴或扇形。**

運輸署的官方資料字典只定義九個欄位：鏡頭編號、地區、分區、影像位置描述、Easting、Northing、緯度、經度和影像網址。資料字典沒有 `heading`、`bearing`、`direction` 或視野角度欄位。[1]

繁中及英文的 `Traffic Camera Locations` XML 與資料字典一致。它提供每一點的名稱、座標及原始 JPEG 網址，但沒有相機朝向欄位。[2] [3] 已發布的 1,013 筆資料中，809 筆繁中名稱包含「東／西／南／北行」字眼。這是官方的影像位置描述的一部分，不是可量度或可驗證的鏡頭拍攝 heading。道路可彎曲，鏡頭亦可以斜向取景，所以把這些文字自動轉成地圖箭嘴會製造假精準資訊。

ParkPulse 會保留原有的官方名稱，例如「香港仔海旁道近福群大樓－東行」。但在運輸署公開逐鏡頭的角度或視野資料之前，地圖不會顯示箭嘴、扇形或度數。日後如官方增加該資料，可在已保存的官方鏡頭 ID 上直接附加並顯示。

## 相片優先詳情

用家點選交通快拍後，詳情面板現時在名稱、地址和所有文字資料之前顯示 4:3 的運輸署原始快拍。官方資料說明影像格式為 JPEG，解析度為 320 × 240。[1]

相片以瀏覽器直接向運輸署 `tdcctv.data.one.gov.hk/<Key>.JPG` 請求。ParkPulse、GitHub Pages 和任何中間伺服器均不下載、儲存、代理或鏡像該影像。相片可點選在新分頁直接開啟，並有「重新載入相片」按鈕；若原圖暫時無法載入，詳情文字不會消失，並會顯示同一張官方原圖的直接連結。

官方資料集把交通快拍界定為約每兩分鐘更新的 JPEG 快照，並非連續直播；個別鏡頭可暫時出現 `No Service`。[1] 因此詳情內會保留這項提示，並以使用者明確重新載入或重新開啟詳情取得新圖。

## 已完成的核對

手機寬度的正式 Pages 建置版已以真實運輸署圖片測試：原始 320 × 240 圖片位於詳情標題之前、可正常重新載入，而且在無效圖片請求時可顯示官方原圖後備連結。交通快拍資料、地圖水滴 marker、TypeScript、Pages 與 PWA 檢查亦已通過。

## References

[1]: https://static.data.gov.hk/td/traffic-snapshot-images/en/Summary_of_traffic_snapshot_images.pdf "Transport Department traffic snapshot images data dictionary"

[2]: https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_Tc.xml "Transport Department traffic camera locations Traditional Chinese XML"

[3]: https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_En.xml "Transport Department traffic camera locations English XML"
