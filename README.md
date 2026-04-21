# 聆韻 · Piano Atelier

给钢琴习者的一个 Web 工具集：音高辨识、和弦助手、MIDI ↔ 简谱/五线谱互转。

## 三大功能

| # | 功能 | 描述 |
|---|---|---|
| 01 | **音高辨识** | 通过麦克风实时识别琴音，显示音名、频率、音分偏差；键盘可视化同步高亮。 |
| 02 | **和弦助手** | 输入旋律音符 + 调性，列出可用和弦并推荐下一步。 |
| 03 | **乐谱转换** | 导入 MIDI → 简谱/五线谱；也可手写简谱让它合成弹奏。 |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（自动打开浏览器，热更新）
npm run dev

# 生产构建 → 输出到 dist/
npm run build

# 预览构建结果
npm run preview
```

需要 Node.js ≥ 18。

## 项目结构

```
src/
├── main.js                     # 入口：Tab 切换、初始化
├── core/                       # ── 纯逻辑层（零 DOM 依赖）
│   ├── music-theory.js         #     音名/MIDI/频率/调式/和弦
│   ├── pitch-detect.js         #     自相关算法 + PitchDetector
│   ├── midi-parser.js          #     MIDI 文件二进制解析
│   ├── harmony.js              #     和声进行规则
│   └── notation.js             #     时值 → 乐谱数据模型
├── ui/                         # ── 视图层（DOM + 事件）
│   ├── piano-keyboard.js       #     可复用键盘组件
│   ├── pitch-panel.js          #     面板 01
│   ├── chord-panel.js          #     面板 02
│   ├── score-panel.js          #     面板 03
│   ├── jianpu-render.js        #     简谱渲染器
│   └── staff-render.js         #     VexFlow 五线谱适配层
└── styles/
    ├── theme.css               #     CSS 变量
    ├── base.css                #     全局、头部、Tab
    └── components.css          #     组件样式
```

## 架构原则

- **分层**：`core/` 全部是纯函数或无 DOM 依赖的类，可独立单测；`ui/` 只做 DOM 绑定。以后换框架（React/Vue/Svelte）只需重写 `ui/`。
- **依赖**：`vexflow` 和 `tone` 用 npm 管理，锁定版本，离线可用。
- **ES 模块**：原生 `import/export`，由 Vite 打包。

## 部署

- 部署到 Cloudflare Pages：见 [`docs/DEPLOY.md`](./docs/DEPLOY.md)
- 打包成桌面 App（Tauri）：见 [`docs/DESKTOP.md`](./docs/DESKTOP.md)

## 已知限制

1. **单音识别**：当前 pitch detection 用自相关算法，只能识别单音，不支持复调。需要多音识别的话建议换 CREPE 或 SPICE 神经网络模型（可用 ONNX Runtime Web 跑）。
2. **合成器音色**：用 Tone.js 的 PolySynth + triangle 波形，不是真实钢琴音色。想要真实音色请接入 Salamander Piano 采样包。
3. **MIDI 只取主旋律**：导入多声部 MIDI 时会简化为单声部（同 tick 取最高音）。

## License

MIT
