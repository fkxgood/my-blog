export async function GET() {
  const posts = import.meta.glob('./posts/*.mdx', { eager: true });
  const index = Object.values(posts).map((post) => ({
    title: post.frontmatter?.title || '',
    url: post.url || '',
    category: post.frontmatter?.category || '',
    tags: post.frontmatter?.tags || [],
    content: post.frontmatter?.description || '',
  }));

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
} 