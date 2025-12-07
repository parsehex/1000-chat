<template>
  <div class="playground">
    <div class="pane input-pane">
      <h2>Input</h2>
      <textarea
        v-model="inputText"
        placeholder="Type here..."
        @input="processText"
      ></textarea>
      <div class="stats">
        Word count: {{ wordCount }} | Valid: {{ validCount }} | Invalid: {{ invalidCount }}
      </div>
    </div>
    <div class="pane preview-pane">
      <h2>Preview</h2>
      <div class="output">
        <template v-for="(token, index) in tokens" :key="index">
          <span :class="{ invalid: !token.valid }">{{ token.text }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { initWordList, isValid } from '../utils/wordList'

const inputText = ref('')

interface Token {
  text: string
  valid: boolean
}

const tokens = computed<Token[]>(() => {
  if (!inputText.value) return []
  // Split by whitespace but keep delimiters effectively?
  // We want to reconstruct the text.
  // Regex to match words and non-words.
  // ([a-zA-Z0-9]+)|([^a-zA-Z0-9]+)
  // Actually, we want to highlight words. Punctuation is usually "valid" (ignored).

  const parts = inputText.value.split(/([a-zA-Z0-9'-]+)/g)

  return parts.map(part => {
    // If part is empty, skip (split artifacts)
    if (!part) return { text: '', valid: true }

    // Check if it's a word or just punctuation/whitespace
    if (/^[a-zA-Z0-9'-]+$/.test(part)) {
      return {
        text: part,
        valid: isValid(part)
      }
    } else {
      // Punctuation/whitespace is always "valid" (not highlighted red)
      return {
        text: part,
        valid: true
      }
    }
  }).filter(t => t.text)
})

const wordCount = computed(() => tokens.value.filter(t => /^[a-zA-Z0-9'-]+$/.test(t.text)).length)
const validCount = computed(() => tokens.value.filter(t => /^[a-zA-Z0-9'-]+$/.test(t.text) && t.valid).length)
const invalidCount = computed(() => tokens.value.filter(t => /^[a-zA-Z0-9'-]+$/.test(t.text) && !t.valid).length)

onMounted(() => {
  initWordList()
})

function processText() {
  // Logic is reactive, nothing manual needed
  // Might auto-scroll preview here if needed
}
</script>

<style scoped>
.playground {
  display: flex;
  gap: 2rem;
  height: 70vh;
}
.pane {
  flex: 1;
  display: flex;
  flex-direction: column;
}
h2 {
  margin-top: 0;
  color: #2c3e50;
}
textarea {
  flex: 1;
  width: 100%;
  padding: 1rem;
  font-size: 1.1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: none;
  font-family: inherit;
}
.output {
  flex: 1;
  padding: 1rem;
  font-size: 1.1rem;
  border: 1px solid #e9ecef;
  background-color: #f8f9fa;
  border-radius: 4px;
  white-space: pre-wrap; /* Preserve whitespace */
  overflow-y: auto;
}
.invalid {
  color: #e74c3c;
  text-decoration: line-through;
  text-decoration-color: #e74c3c;
  font-weight: bold;
}
.stats {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #666;
}
</style>
