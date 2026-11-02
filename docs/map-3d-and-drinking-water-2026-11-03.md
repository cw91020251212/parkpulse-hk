# 港鐵飲水機與3D地圖捷徑

港鐵官方名錄：https://www.mtr.com.hk/ch/customer/services/water_dispenser.html 。站名及大堂出口資料可公開讀取，但不等於已發布出水口的精確座標。以官方出口或車站點輔助尋找時，必須明示場地級定位並保留原機位文字。

飲水圖案改用 Lucide glass-water 的簡潔水杯線條，以白色杯身、深藍輪廓及藍色水線提高地圖縮小後辨識度；沿用其他設施由左下深色至右上淺色的漸變水滴。來源 https://lucide.dev/icons/glass-water ，授權 https://lucide.dev/license ，完整聲明隨網站 `public/licenses/lucide-ISC.txt` 保存。不使用此圖代替場地照片。

地政總署3D功能研究中，只有實際驗證能帶入指定座標的官方分享協議才會接入。3D場景並非街景照片，不把無證據的URL參數當成可用深連結。外連開新分頁，不重設原Leaflet中心或站內返回堆疊。

## 已核實的3D協議及返回

官方Open3Dhk公開程式 `https://3d.map.gov.hk/mapviewer/app/js/795.e2c79549.js` 的 `parseLookAt()` 讀取 `lookat=緯度,經度,相機高度c`。`i=false` 保留位置標記而不另彈識別資訊，語言 `l=zh-HK`，預設斜視3D。`500c` 為相機高度輸入，實際高度會依地形調整，並不是機器高度或固定樓層。這是目前官方應用的公開連結協議，不是保證永遠不變的版本化API。

2026-11-03以手機尺寸及WebGL實測九龍 `https://3d.map.gov.hk/?lookat=22.299000%2C114.171000%2C500c&i=false&l=zh-HK` 和大埔 `https://3d.map.gov.hk/?lookat=22.450000%2C114.170000%2C500c&i=false&l=zh-HK`：Cesium scene.mode=3，位置針分別在22.299/114.171和22.45/114.17，證明不是只打開全港預設畫面。首次手機流量提示20秒後會取消載入；必須選「繼續」。網站需要WebGL，3D及街景影像可能消耗較多流量。

官方響應同時指定 `Content-Security-Policy: frame-ancestors 'none'` 及 `X-Frame-Options: DENY`，因此不嵌入iframe或繞過政策。新分頁保留原程式，手機返回或關閉3D分頁可回原頁。原頁另提供「返回原地圖視野」，可還原開3D前中心及縮放，不強制回GPS。外連前視野及原定位只保存於本機sessionStorage，兩小時有效、關閉工作階段失效；手機回收原頁時可恢復中心／縮放與範圍，不會重新啟動GPS搶走視野。已開著的原頁維持設施和詳情選擇。

地圖上的3D鍵以「目前畫面中心」為目標；設施詳情的3D鍵以「該設施座標」為目標，兩者不混淆。官方3D中的「街景360」另行選取且受覆蓋限制，不能把3D模型稱為街景照片。官方說明：https://www.landsd.gov.hk/tc/survey-mapping/mapping/3d-mapping.html 。

## 邊界修正

只讀審查發現向香港外拖圖會令URL驗證throw；介面現安全停用該3D外連，不讓render白屏。明確恢復時清除舊recenter請求，並把Restore effect排在Recenter／FocusSelected之後，以 `map.stop().setView(...,{animate:false})` 停止飛行及回復精確視野（Leaflet官方Map reference）。地圖內控制使用capture事件，避免原生地圖的停止冒泡攔截React按鈕。外連前同步向Leaflet讀取實際中心和zoom，而不是使用可能尚未由requestAnimationFrame回報的React舊視野；停止仍在執行的GPS飛行，避免背景頁動畫把視野改走。手機回收後還原限瀏覽器允許sessionStorage的情況；儲存受阻時原頁記憶體仍保留，但無法保證整頁被系統銷毀後還原。

官方及公開案例：https://leafletjs.com/reference.html#map-stop 、https://github.com/Leaflet/Leaflet/issues/3754 、https://github.com/PaulLeCam/react-leaflet/issues/866 。本專案不是直接假設舊issue仍存在，而是以手機相機呼叫時間線確認實際競爭後作最小處理。

手機390px整合實測已通過：港鐵卡顯示非付款區及非精確機器定位；漸變實際計算樣式存在；設施3D外連為新分頁，關閉外部分頁後原詳情仍存在；改動原地圖zoom後一按還原開啟前中心及zoom；再重新載入原頁，不啟動GPS且視野一致。包括在首次GPS飛行尚未完成就按3D的情境：先以無動畫固定Leaflet目前中心及整數zoomSnap，再讀取真實視野，避免使用尚未更新的React快取或暫態小數zoom。重載測試等待新文件初始化標記，而非拿舊DOM誤判。
