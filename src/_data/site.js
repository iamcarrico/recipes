export default {
  title: 'Carrico Recipes',
  // Label under the home-screen icon; iOS truncates anything much longer.
  shortTitle: 'Recipes',
  tagline: 'The ones we actually cook.',
  description:
    'A small, searchable collection of the Carrico family’s favorite recipes.',
  // Netlify and Cloudflare Pages both expose the deploy URL at build time.
  url: process.env.URL || process.env.CF_PAGES_URL || 'http://localhost:8080',
  author: 'Ian Carrico',
  // Keep the site out of search engines and AI training. Drives robots.txt,
  // the robots meta tag, X-Robots-Tag headers and TDM opt-out signals, and
  // drops the schema.org data that exists mainly for crawlers.
  private: true,
  // noai/noimageai are not standards, but some crawlers and platforms honour them.
  robotsDirectives: 'noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai',
  buildYear: new Date().getFullYear()
};
