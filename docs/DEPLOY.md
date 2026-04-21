# 部署到 Cloudflare Pages

本指南用 **Git 连接方式**部署（最省心，推送代码自动构建上线）。

## ⚠️ 国内访问的重要提醒

**Cloudflare 的默认 `*.pages.dev` 域名在中国大陆访问不稳定**：
- 大部分地区能访问，但速度不稳定（3-10 秒首屏常见）
- 部分运营商/地区可能完全无法打开
- DNS 解析偶尔会失败

### 如何改善

**最推荐**：花 ¥10/年买一个便宜域名（`.xyz` / `.top` / `.icu`），绑定到 Pages：
- 推荐注册商：[Porkbun](https://porkbun.com)、[Namesilo](https://www.namesilo.com)、[Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)
- **不需要 ICP 备案**（Cloudflare 走海外节点）
- 绑定后国内访问显著改善，速度稳定

绑定步骤见本文档末尾「自定义域名」章节。

---

## 第一步：把代码推到 Git 仓库

Cloudflare Pages 从 GitHub 或 GitLab 拉代码。注册/登录 GitHub 后：

```bash
cd piano-atelier

# 初始化 Git
git init
git add .
git commit -m "Initial commit"

# 在 GitHub 网页上新建一个空仓库（不要勾选初始化任何文件）
# 然后替换下面的 YOUR_USERNAME 和仓库名
git remote add origin git@github.com:YOUR_USERNAME/piano-atelier.git
git branch -M main
git push -u origin main
```

## 第二步：在 Cloudflare Pages 创建项目

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)，没账号先注册（免费）
2. 左侧菜单 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. 授权 Cloudflare 访问你的 GitHub，选中 `piano-atelier` 仓库
4. 配置构建参数：

| 字段 | 值 |
|---|---|
| Project name | `piano-atelier`（决定最终域名 `piano-atelier.pages.dev`） |
| Production branch | `main` |
| Framework preset | `Vite` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/`（保持默认） |
| Environment variables | 无需设置 |

5. 点 **Save and Deploy**，等 1-3 分钟构建完成。

构建成功后你会得到一个形如 `https://piano-atelier.pages.dev` 的网址。

## 第三步：验证部署

浏览器打开你的 pages.dev 地址，检查：

- ✅ 页面正常加载（字体、样式正确）
- ✅ 点「启动麦克风」能弹权限请求（证明 HTTPS 生效）
- ✅ 三个 Tab 都能切换
- ✅ MIDI 导入/示例/播放正常
- ✅ 移动端访问正常

## 之后的更新

以后只要 `git push`，Cloudflare 会自动重新构建部署。每个 PR 还会生成独立的预览链接。

```bash
# 修改代码后
git add .
git commit -m "描述改动"
git push
```

## 自定义域名（强烈推荐）

### 购买域名

1. 去 Cloudflare Registrar / Porkbun / Namesilo 搜一个满意的域名
2. 推荐后缀：`.xyz`（首年 ~¥8）、`.top`（首年 ~¥9）、`.icu`（首年 ~¥7）
3. **不要在阿里云/腾讯云买** —— 那些要求实名 + 不方便做海外 DNS

### 绑定到 Cloudflare Pages

1. Cloudflare Dashboard → Pages 项目页 → **Custom domains** → **Set up a custom domain**
2. 输入你的域名 → **Continue** → **Activate domain**
3. **如果域名不在 Cloudflare**：按它的提示改 Nameserver 到 Cloudflare，5-30 分钟生效
4. **如果域名就在 Cloudflare**：DNS 记录会自动添加

完成后 HTTPS 证书自动签发，几分钟内你的域名就能访问了。

### 国内提速进阶

默认情况下 Cloudflare 把中国大陆请求路由到美西或香港节点。想进一步提速有两条路：

- **Cloudflare China Network**（需企业版套餐 + 百度合作 + ICP 备案，个人项目不适用）
- **腾讯云 CDN 回源 Cloudflare**：在腾讯云开通 CDN，回源域名填你的 pages.dev 地址，加速域名填你在国内备案过的域名（需 ICP 备案）

个人项目不建议折腾，就用普通自定义域名就行。

---

## 排错常见问题

### 构建失败：`npm install` 报错
检查 `package.json` 里 `node` 版本。Cloudflare Pages 默认 Node 18，如果你本地用更新版本，在 Pages 项目的 **Settings** → **Environment variables** 里加一条：
- `NODE_VERSION` = `20`

### 部署后页面白屏
F12 打开 Console 看报错。最常见是：
- 静态资源路径错了 → 检查 `vite.config.js` 的 `base` 是不是 `'/'`
- 字体加载被墙 → 见下一条

### 国内用户反馈字体没加载
jsDelivr 在国内偶尔也不稳。最彻底的方案是把字体文件直接打包进项目：

```bash
npm install @fontsource/fraunces @fontsource/dm-sans @fontsource/jetbrains-mono @fontsource/noto-serif-sc
```

然后在 `src/main.js` 顶部加：
```js
import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/300-italic.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/noto-serif-sc/600.css';
```

删掉 `index.html` 里的那几行字体 `<link>`。这样字体会被 Vite 打包进 dist，和应用一起走 Cloudflare CDN 分发。

### 麦克风权限不弹
确认访问的是 `https://` 不是 `http://`。`pages.dev` 默认强制 HTTPS，一般不会有这问题。

### MIDI 导入"不是有效的 MIDI 文件"
检查文件是 `.mid` 扩展名（不是 `.xml` / `.musicxml`）。MusicXML 是另一种格式，我们的解析器不支持。

---

## 费用

- **Cloudflare Pages 免费额度**：500 次构建/月、无限请求、无限带宽、无限项目
- **域名**（如果买）：¥8-15/年
- **总计**：每年不到一杯奶茶的钱
