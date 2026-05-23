# JFic

用完整上下文，写出原汁原味的同人。

JFic 是一个纯前端的 AI 同人创作工具。上传原著 txt，配置大模型 API，就能在阅读器里一章一章续写。核心思路很简单：借助 1M token 的超长上下文，把原著全文塞进去，不压缩、不摘要、不切片，让模型动笔前真的「读」过原作。

所有数据（API Key、小说文本、生成章节）都存浏览器 IndexedDB，没有后端，没有注册。

## 快速开始

```bash
npm install
npm run dev      # http://localhost:5173/
npm run build    # 输出到 dist/
```

Node 22+。

默认对接 DeepSeek API（`https://api.deepseek.com`，模型 `deepseek-v4-pro`），也兼容任何 OpenAI 兼容接口。首次访问在页面里填 Base URL / API Key / 模型即可。

## 部署

纯静态，Vite 用相对路径 + HashRouter 打包，扔到任意 CDN 或子路径都能跑。

GitHub Pages 部署：push 之后在 Settings → Pages 把 Source 选为 GitHub Actions，仓库已自带 workflow。

## 项目结构

```
src/
├── pages/           # 路由页面
├── components/
│   ├── reader/      # 阅读器组件
│   ├── book/        # 书架组件
│   └── ui/          # 基础 UI 原语
├── hooks/           # 数据 & 副作用 hooks
├── db/              # IndexedDB (Dexie)
├── utils/           # 常量、消息构建、API 调用、token 估算等
├── App.tsx
└── main.tsx
```

详细设计见 [DESIGN.md](./DESIGN.md)。

## License

[MIT](./LICENSE) © 2026 jie65535
