import { defineConfig } from 'vite'

export default defineConfig({
  // 相对路径，保证部署到 GitHub Pages 项目子路径（/<repo>/）时资源依然可用
  base: './',
  server: { host: '127.0.0.1' },
  build: { target: 'es2022', assetsInlineLimit: 0 },
})
