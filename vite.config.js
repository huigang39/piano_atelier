import { defineConfig } from 'vite';

export default defineConfig({
  // '/' 适用于 Cloudflare Pages / Vercel / 自定义域名根路径
  // 如果部署到 GitHub Pages 子路径（user.github.io/piano-atelier/），改成 '/piano-atelier/'
  base: '/',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,  // 生产构建关闭 sourcemap 以减小体积
    target: 'es2020',
    // Cloudflare Pages 对文件大小有限制（单文件 < 25MB），但我们远不会达到
  },
});
