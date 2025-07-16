# Mr. Feng 技术博客

使用 [Astro](https://astro.build/) + MDX + TailwindCSS 构建的纯静态博客，支持分类、标签、全文搜索与暗色模式，可部署在 GitHub Pages。

## 本地开发

```bash
pnpm install  # 或 npm install / yarn
pnpm dev      # 启动开发服务器
```

访问 <http://localhost:4321> 预览。

## 文章写作

在 `src/pages/posts` 目录下新增 `.mdx` 文件，并在 FrontMatter 中填写：

```yaml
---
title: 文章标题
date: 2023-08-10
category: 分类名称
tags:
  - 标签1
  - 标签2
---
```

即可自动出现在主页、分类与标签页面，并被搜索索引收录。

## 部署到 GitHub Pages

1. 将仓库命名为 `your-username.github.io` 或任何名称。
2. 修改 `astro.config.mjs` 中的 `site` 字段为你的实际公开网址，例如：
   ```js
   site: 'https://feng.github.io/my-blog',
   ```
3. 推送到 `main` 分支，GitHub Actions 将自动构建并发布到 Pages。

## TODO

- [ ] 归档页面
- [ ] PWA 支持 