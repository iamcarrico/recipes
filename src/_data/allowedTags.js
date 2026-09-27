/**
 * The only tags recipes may use. Keeping the list short keeps the homepage
 * filters useful; the build fails on anything else (see lib/validate.js), so
 * add a tag here first if you really need a new one.
 *
 * Deliberately not named tags.js: Eleventy merges a global `tags` value into
 * every page's own tags, which put all six on every recipe.
 */
export default ['Breakfast', 'Dinner', 'Side', 'Dessert', 'Thanksgiving', 'Pantry'];
