<template>
  <header>
    <nav>
      <router-link to="/" class="logo">1000 Chat</router-link>
      <div class="links">
        <router-link to="/">Home</router-link>
        <router-link to="/playground">Playground</router-link>
        <router-link to="/chat">Chat</router-link>
      </div>
    </nav>
  </header>
  <main>
    <router-view />
  </main>
</template>
<script setup lang="ts">
</script>
<style scoped>
header {
  padding: 1rem 2rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.logo {
  font-weight: bold;
  font-size: 1.5rem;
  text-decoration: none;
  color: #2c3e50;
}

.links a {
  margin-left: 1.5rem;
  text-decoration: none;
  color: #2c3e50;
  font-weight: 500;
}

.links a.router-link-active {
  color: #42b983;
}

main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}
</style>
