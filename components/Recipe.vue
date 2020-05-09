<template>
  <article class="Recipe">
    <h1>{{ name }}</h1>
  </article>
</template>

<style>
.Recipe {
  color: blue;
}
</style>

<script>
export default {
  props: {
    name: {
      type: String,
      required: true
    }
  }
}
</script>
