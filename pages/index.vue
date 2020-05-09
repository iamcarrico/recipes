<template>
  <div class="container">
    <div>
      <h1 class="title">
        recipes.iancarrico.com
      </h1>

      <recipe-list :recipes="recipes"></recipe-list>

    </div>
  </div>
</template>

<script>
import RecipeList from '~/components/RecipeList.vue'

import ButternutSquash from '~/recipes/json/Butternut Squash Soup.json'
import Pickles from '~/recipes/json/Quick & Easy Refrigerator Pickles.json'
import MacAndCheese from '~/recipes/json/How to Make Creamy Macaroni and Cheese on the Stove.json'

export default {
  components: {
    RecipeList
  },
  data: function () {
  return {
    recipes: [
      ButternutSquash,
      Pickles,
      MacAndCheese
    ]
  }
}
}
</script>

<style>
.container {
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.title {
  font-family: 'Quicksand', 'Source Sans Pro', -apple-system, BlinkMacSystemFont,
    'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  display: block;
  font-weight: 300;
  font-size: 100px;
  color: #35495e;
  letter-spacing: 1px;
}

</style>
