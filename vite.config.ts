import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// 所有产出资源使用相对路径,部署到任意子路径或域名都开箱即用,无需任何环境变量。
// 配合 HashRouter,路由也不受部署路径影响。
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
