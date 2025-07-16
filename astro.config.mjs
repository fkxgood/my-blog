import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';

// GitHub Pages 配置
export default defineConfig({
  // 🚀 部署到 GitHub Pages 的设置
  site: 'https://fkxgood.github.io/my-blog',
  base: '/my-blog',
  
  // 静态输出配置
  output: 'static',
  
  integrations: [tailwind(), mdx()],
}); 