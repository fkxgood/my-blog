# GitHub Pages 部署指南

## 📝 部署步骤

### 1. 修改 Astro 配置

在 `astro.config.mjs` 中，将 `USERNAME` 和 `REPO_NAME` 替换为你的实际值：

```javascript
site: 'https://YOUR_USERNAME.github.io/YOUR_REPO_NAME',
base: '/YOUR_REPO_NAME',
```

**注意：**
- 如果你的仓库名是 `your-username.github.io`，则 `base` 应该设置为 `'/'`
- 例如：`site: 'https://john.github.io/my-blog'`, `base: '/my-blog'`

### 2. 推送代码到 GitHub

```bash
# 初始化 git 仓库（如果还没有）
git init

# 添加所有文件
git add .

# 提交变更
git commit -m "Initial commit: Astro blog setup"

# 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 推送到 main 分支
git push -u origin main
```

### 3. 配置 GitHub Pages

1. 打开你的 GitHub 仓库页面
2. 点击 **Settings** 标签
3. 在左侧菜单中找到 **Pages** 选项
4. 在 **Source** 部分选择 **GitHub Actions**
5. 保存设置

### 4. 等待自动部署

推送代码后，GitHub Actions 会自动：
- 安装依赖
- 构建 Astro 项目
- 部署到 GitHub Pages

你可以在 **Actions** 标签页查看构建进度。

### 5. 访问你的博客

部署完成后，你的博客将在以下地址可用：
`https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`

## 🛠️ 本地开发

### 开发环境启动
```bash
cd my-blog
pnpm install
pnpm dev
```

### 本地构建测试
```bash
pnpm build
pnpm preview
```

## 📁 项目结构

```
my-blog/
├── .github/workflows/deploy.yml  # GitHub Actions 工作流
├── public/                       # 静态资源
│   └── .nojekyll                 # 告诉 GitHub Pages 不使用 Jekyll
├── src/
│   ├── components/               # Astro 组件
│   ├── layouts/                  # 页面布局
│   ├── pages/                    # 页面和博客文章
│   └── styles/                   # 样式文件
├── astro.config.mjs              # Astro 配置
└── package.json                  # 项目依赖
```

## 🔧 故障排除

### 构建失败
- 检查 `astro.config.mjs` 中的 `site` 和 `base` 配置是否正确
- 确保所有依赖都已正确安装
- 查看 Actions 标签页的错误日志

### 页面无法访问
- 确保 GitHub Pages 设置为使用 GitHub Actions
- 检查仓库是否为公开仓库（私有仓库需要付费版本）
- 等待几分钟让 DNS 生效

### 样式或资源加载失败
- 检查 `base` 配置是否正确
- 确保所有资源路径都是相对路径

## 📝 更新博客

每次修改内容后：
1. 提交并推送到 main 分支
2. GitHub Actions 会自动重新部署
3. 几分钟后更新就会生效

## 🎨 自定义

- 修改 `src/styles/global.css` 来调整全局样式
- 在 `src/components/` 中添加新组件
- 在 `src/pages/posts/` 中添加新的博客文章（.mdx 格式） 