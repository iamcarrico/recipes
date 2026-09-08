export default {
  layout: 'layouts/recipe.njk',
  // Recipes live at /recipes/<slug>/ regardless of the source filename.
  permalink: (data) => `/recipes/${data.page.fileSlug}/`,
  tags: [],
  ingredients: [],
  directions: []
};
