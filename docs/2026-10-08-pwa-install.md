# 2026-10-08｜GitHub Pages PWA 安装

## 原因

GitHub Pages 首次发布时没有 Web App Manifest、192×192／512×512 安装图标或 Service Worker，因此手机浏览器不会把它识别为可安装的 Web App；清除 Cookie、缓存或暂存数据无法补足这些缺失的站点资源。

## 修正

项目现自有以下 PWA 文件，并通过 GitHub Pages 的 `/parkpulse-hk/` 路径提供：

- `public/manifest.webmanifest`：名称为 **ParkPulse HK｜泊邊有位**，以 standalone 模式启动。
- `public/parkpulse-hk-icon-192.png` 与 `public/parkpulse-hk-icon-512.png`：Android／Chrome 安装图标。
- `public/sw.js`：Service Worker，只缓存同源应用外壳及 GitHub Actions 生成的静态设施数据；HTML／静态资料使用网络优先并有离线回退，不缓存 data.gov.hk 即时空位或第三方地图。

iPhone／iPad 使用 Safari 的分享菜单「加入主画面」；Android／Chrome 从浏览器菜单选择「安装应用程序」或「加到主画面」。安装后的即时车位与地图仍需要网络连接。

## 正式发布验证

- GitHub Actions workflow `37775336124` 于 2026-10-08 成功完成 build 和 deploy。
- 正式网址 `https://cw91020251212.github.io/parkpulse-hk/` 已回传 HTTP 200。
- `manifest.webmanifest`、`sw.js`、192px 图标和 512px 图标均回传 HTTP 200；manifest 使用 `standalone` 显示模式。
- 浏览器实测处于安全 HTTPS 环境，Service Worker 已控制网页，scope 为 `https://cw91020251212.github.io/parkpulse-hk/`。
