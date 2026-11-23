# KeyCat

一只趴在键盘上的桌面猫：你打字它伸爪按键，动鼠标它扭头看，摸头会闭眼，没人理会睡着，被烦到会用尾巴捶桌。支持 macOS 13+ 和 Windows 10+，不联网。

![KeyCat](docs/screenshots/curious.jpg)

## 下载

**Windows**：[下载 KeyCat-Windows-Setup.exe](https://github.com/Buildlee/KeyCatRe/releases/latest/download/KeyCat-Windows-Setup.exe)

双击安装就能用，不需要额外装运行时（界面由系统自带的 WebView2 绘制），装完在托盘里出现一只猫。装好会注册卸载项，卸载走安装目录里的 `uninstall.exe`，或者「设置 → 应用」。

## 安装

**macOS**：在终端执行

```sh
curl -L -o /tmp/KeyCat-macOS.zip https://github.com/ElloboDK/KeyCat/releases/latest/download/KeyCat-macOS.zip \
  && unzip -qo /tmp/KeyCat-macOS.zip -d /Applications && open /Applications/KeyCat.app
```

首次启动需在「系统设置 → 隐私与安全性 → 输入监控」里允许 KeyCat，然后重启应用。它只读取哪个键被按下，不记录输入内容。手动从浏览器下载时，若提示「已损坏」，执行 `xattr -dr com.apple.quarantine /Applications/KeyCat.app`。

**Windows**：从 [Releases](https://github.com/Buildlee/KeyCatRe/releases/latest) 下载 `KeyCat-Windows-Setup.exe` 运行。SmartScreen 拦截时点「更多信息 → 仍要运行」。安装包只有几 MB，猫由系统自带的 WebView2 绘制，极少数没装 WebView2 的 Win10 会在安装时自动下载。默认装到 `D:\Program\KeyCat`，没有 D 盘时退到 `%LOCALAPPDATA%\KeyCat`，安装向导里也能自己改目录。应用不会自动更新：有新版本时到 Releases 页手动下载安装即可，设置会保留。

## 使用

猫住在菜单栏（Windows 是托盘）。右键猫或点图标打开菜单，可以换毛色和外观、调大小、设置多久睡着，在「调节反应…」里调整烦躁和好奇的灵敏度。按住猫身体可以拖动位置。

## 构建

```sh
npm install && npm run build:web   # → web/dist（裁剪后的 three.min.js + 压缩后的 app.bundle.min.js）
sh mac/build.sh       # → build/KeyCat.app（通用二进制，需 Xcode 命令行工具）
sh mac/package.sh     # → dist/KeyCat-macOS.zip + .sha256

cd win && npm ci
npm start             # 本机调试
npm run dist          # → win/target/release/bundle/nsis/KeyCat_<版本>_x64-setup.exe（需 Rust 和 Node.js 22+，在 Windows 上执行）
```

Windows 安装包用 `win/nsis/installer.nsi` 打底：那是 tauri-cli v2.12.6 的 NSIS 模板副本，只改了默认安装目录一处（`bundle.windows.nsis` 没有这个配置项）。升级 `@tauri-apps/cli` 时要重新复制上游模板并把那处改动补回去。

mac 版用 `signing/` 里自动生成的本地证书签名，这样重新编译后「输入监控」授权仍然有效。Windows 版不做 updater 签名，也不需要任何密钥，所以没有会自动滚动的东西要维护。不要提交 `signing/` 目录。

## 发布

本仓库的 Release 只发布 Windows 安装包：macOS 产物需要在 Mac 上用 Xcode 打包，仍走上游仓库。

1. 把 `win/package.json` 的 `version` 和 `mac/Info.plist` 的 `CFBundleShortVersionString` 改成同一个版本，`CFBundleVersion` 加 1，合入 main。
2. 推送 `vX.Y.Z` tag，GitHub Actions 会构建安装包并自动建 Release、上传 `KeyCat-Windows-Setup.exe`。
3. 整个过程不需要任何签名密钥，也不生成 `latest.json` / `latest.yml`：应用没有 updater，用户手动来下载。

## 目录

```
mac/    macOS 外壳（Swift）：浮窗、菜单、键鼠监听、构建/签名/打包脚本
win/    Windows 外壳（Tauri，Rust）：托盘、全局键鼠钩子，页面由系统 WebView2 绘制
web/    两端共用的 three.js 场景：猫、键盘、动作，tuning.js 是可调参数的唯一来源
tools/  开发用渲染脚本（serve.py 起本地服务，其余脚本在内置浏览器里截图对比）
```

## 说明

这是一个从零实现的学习项目，形象和交互参考了一款付费桌面宠物应用，仅供个人使用和内部交流，不用于商业分发，也不包含对方的任何素材。three.js 为 MIT 许可（见 `web/THREE_LICENSE`），Tauri 为 MIT / Apache-2.0 双许可。
