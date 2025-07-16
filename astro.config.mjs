import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';

// GitHub Pages 配置
export default defineConfig({
  // 🚀 部署到 GitHub Pages 的设置
  // 请将下面的 USERNAME 替换为你的 GitHub 用户名，REPO_NAME 替换为仓库名
  site: 'https://USERNAME.github.io/REPO_NAME',
  base: '/REPO_NAME', // 如果部署到 username.github.io 则设置为 '/'
  
  // 静态输出配置
  output: 'static',
  
  integrations: [tailwind(), mdx()],
}); 