export default {
  title: 'Carrico Recipes',
  tagline: 'The ones we actually cook.',
  description:
    'A small, searchable collection of the Carrico family’s favorite recipes.',
  // Netlify and Cloudflare Pages both expose the deploy URL at build time.
  url: process.env.URL || process.env.CF_PAGES_URL || 'http://localhost:8080',
  author: 'Ian Carrico',
  buildYear: new Date().getFullYear()
};
