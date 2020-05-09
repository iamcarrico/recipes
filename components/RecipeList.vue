<template>
  <div class="RecipeList">
    <recipe
      v-for="(recipe, index) in recipes"
      v-bind="recipe"
      :key="index"></recipe>
  </div>
</template>

<style>
.RecipeList {
  color: blue;
}
</style>

<script>
import Recipe from '~/components/Recipe.vue'

export default {
  components: {
    Recipe
  },
  props: {
    recipes: {
      type: Array,
      default() {
        return [
          {
             name: this.name,
          }
        ]
      }
    },
  }
}
</script>
