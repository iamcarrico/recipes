export default {
  title: 'Carrico Recipes',
  // Label under the home-screen icon; iOS truncates anything much longer.
  shortTitle: 'Recipes',
  tagline: 'The ones we actually cook.',
  description:
    'A small, searchable collection of the Carrico family’s favorite recipes.',
  // The canonical address, used for absolute links such as link-preview
  // images. Not the host's per-deploy URL (Cloudflare's CF_PAGES_URL is a
  // throwaway *.pages.dev address); override with SITE_URL if it moves.
  url: process.env.SITE_URL || 'https://recipe.carri.co',
  author: 'Ian Carrico',
  // Keep the site out of search engines and AI training. Drives robots.txt,
  // the robots meta tag, X-Robots-Tag headers and TDM opt-out signals, and
  // drops the schema.org data that exists mainly for crawlers.
  private: true,
  // noai/noimageai are not standards, but some crawlers and platforms honour them.
  robotsDirectives: 'noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai',
  buildYear: new Date().getFullYear()
};
