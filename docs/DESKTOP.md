# 打包成桌面 App (Tauri 方案)

Tauri 是 Rust 生态的桌面打包方案，相比 Electron：
- **体积小**：通常 5–10 MB（Electron 通常 100+ MB）
- **内存低**：复用系统 WebView
- **性能好**：Rust 后端

## 前置要求

### 1. 安装 Rust 工具链

```bash
# macOS / Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows
# 下载并运行 https://rustup.rs 的安装器
```

### 2. 平台依赖

- **macOS**：Xcode Command Line Tools（`xcode-select --install`）
- **Windows**：Microsoft C++ Build Tools + WebView2（Win10+ 已自带）
- **Linux**：`libwebkit2gtk-4.0-dev`、`libgtk-3-dev`、`libayatana-appindicator3-dev`、`librsvg2-dev` 等

详见 [Tauri 官方前置说明](https://tauri.app/v1/guides/getting-started/prerequisites)。

## 初始化 Tauri

在项目根目录执行：

```bash
# 安装 Tauri CLI
npm install -D @tauri-apps/cli

# 初始化（交互式）
npx tauri init
```

初始化时的关键回答：

| 问题 | 答案 |
|---|---|
| App name | `Piano Atelier` |
| Window title | `聆韻 Piano Atelier` |
| Web assets location | `../dist` |
| Dev server URL | `http://localhost:5173` |
| Frontend dev command | `npm run dev` |
| Frontend build command | `npm run build` |

完成后会生成 `src-tauri/` 目录。

## 开发

```bash
# 开发模式：同时启动 Vite dev server 和 Tauri 窗口
npx tauri dev
```

## 打包

```bash
# 打包当前平台
npx tauri build
```

产物路径（按平台）：

- **macOS**：`src-tauri/target/release/bundle/dmg/` 和 `.../macos/`
- **Windows**：`src-tauri/target/release/bundle/msi/` 或 `nsis/`
- **Linux**：`src-tauri/target/release/bundle/deb/`、`.../appimage/`

## 麦克风权限

Tauri 默认使用系统 WebView，麦克风权限遵循系统机制：

- **macOS**：需要在 `src-tauri/Info.plist` 添加 `NSMicrophoneUsageDescription`
- **Windows**：无需额外配置
- **Linux**：由 PulseAudio / PipeWire 管理

macOS 的 Info.plist 示例：
```xml
<key>NSMicrophoneUsageDescription</key>
<string>聆韻需要访问麦克风以识别钢琴音高</string>
```

## 跨平台打包

Tauri 原生不支持交叉编译。要打包其他平台，可以用：

- **GitHub Actions**：官方有 [tauri-action](https://github.com/tauri-apps/tauri-action)，一次 push 触发三平台打包
- **各平台的虚拟机 / 云构建机**

## 备选方案：Electron

如果更熟悉 Electron 生态，也可以用：

```bash
npm install -D electron electron-builder
```

然后写一个简单的 `electron/main.js` 加载 `dist/index.html` 即可。包体会大一些但生态成熟。
