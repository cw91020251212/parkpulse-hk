# 設定彈窗關閉方式（2026-10-14）

設定齒輪使用原生 `<details>`。開啟時，觸碰／點擊設定彈窗以外任何位置會收起設定；按手機系統返回鍵（瀏覽器 `popstate`）會先收起設定，不會因此離開頁面。設定開啟時會在目前歷史狀態上加入 `parkspotSettings` 標記，關閉時處理該標記，並在返回事件中優先關閉最上層設定。若返回後的狀態仍帶 `parkspotDetail`，不會連帶關掉原本開啟的地點詳情；地圖彈窗的 `parkspotPopup` 狀態亦保留。齒輪本身原有的點按開／關方式不變。

驗證：`pnpm run build` 通過（TypeScript + Vite production build）；390×844手機視口預覽確認齒輪可見；互動瀏覽器以觸控 `pointerdown` 點外部確認選單關閉，並以 `history.back()` 模擬手機返回確認選單關閉及歷史狀態還原。