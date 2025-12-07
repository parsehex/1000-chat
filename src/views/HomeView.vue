<template>
  <div class="home">
    <h1>Welcome to 1000 Chat</h1>
    <p>Explore communication using only the 1000 most common English words.</p>
    <div class="actions">
      <router-link to="/playground" class="btn">Go to Playground</router-link>
      <router-link to="/chat" class="btn">Start Chat</router-link>
    </div>
  </div>
</template>

<style scoped>
.home {
  text-align: center;
  margin-top: 2rem;
}
.actions {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
}
.btn {
  display: inline-block;
  padding: 0.8rem 1.6rem;
  background-color: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
}
.btn:hover {
  background-color: #3aa876;
}
</style>
