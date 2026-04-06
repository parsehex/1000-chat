<template>
  <div class="chat-container">
    <div class="sidebar">
      <h2>Ollama</h2>
      <div v-if="!isConnected" class="status error"> Cannot connect to Ollama (localhost:11434). Please ensure it is
        running. <br>
        <small>Try <code>ollama serve</code></small>
      </div>
      <div v-else class="status success"> Connected </div>
      <div class="model-select">
        <label>Model:</label>
        <select v-model="selectedModel" :disabled="models.length === 0 || loadingEmbeddings">
          <option v-for="model in models" :key="model" :value="model">{{ model }}</option>
        </select>
        <div v-if="loadingEmbeddings" class="status warning" style="margin-top:0.5rem"> Initializing Dictionary: {{
          loadingProgress }}% </div>
      </div>
    </div>
    <div class="chat-main">
      <div class="messages" ref="messagesContainer">
        <div v-if="messages.length === 0" class="empty-state"> Start chatting! <br>
          <small>Messages will be filtered to the top 1000 words (soon).</small>
        </div>
        <div v-for="(msg, idx) in messages" :key="idx" class="message" :class="msg.role">
          <div class="bubble">
            <strong class="role">{{ msg.role === 'user' ? 'You' : 'Bot' }}</strong>
            <div class="content" v-if="msg.isHtml" v-html="msg.content"></div>
            <div class="content" v-else>{{ msg.content }}</div>
          </div>
        </div>
        <div v-if="isLoading" class="message assistant">
          <div class="bubble loading">Thinking...</div>
        </div>
      </div>
      <div class="input-area">
        <textarea v-model="inputRaw" @keydown.enter.prevent="sendMessage" placeholder="Type your message..."
          :disabled="isLoading || !isConnected || !selectedModel"></textarea>
        <button @click="sendMessage"
          :disabled="isLoading || !isConnected || !selectedModel || !inputRaw.trim() || loadingEmbeddings">Send</button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { checkOllama, getTags, chat, type Message } from '../utils/ollama'
import { isValid, initBrowserEmbeddings, findClosestWord, getBrowserEmbedding } from '../utils/wordList'

const isConnected = ref(false)
const models = ref<string[]>([])
const selectedModel = ref('')
const messages = ref<Message[]>([])
const inputRaw = ref('')
const isLoading = ref(false)
const loadingEmbeddings = ref(false)
const loadingProgress = ref(0)
const messagesContainer = ref<HTMLDivElement | null>(null)

// When selectedModel changes, we don't need to re-init embeddings anymore as they are model-independent (local)

onMounted(async () => {
  // Start initializing local embeddings immediately
  loadingEmbeddings.value = true
  initBrowserEmbeddings((count, total) => {
    loadingProgress.value = Math.round((count / total) * 100)
  }).then(() => {
    loadingEmbeddings.value = false
  })

  isConnected.value = await checkOllama()
  if (isConnected.value) {
    models.value = await getTags()
    if (models.value.length > 0) {
      const preferred = models.value.find(m => m.includes('llama3') || m.includes('gemma3'))
      selectedModel.value = preferred || models.value[0]!
    }
  }
})

async function sendMessage() {
  if (!inputRaw.value.trim() || !selectedModel.value || isLoading.value) return

  const content = inputRaw.value.trim()
  inputRaw.value = ''

  // Find invalid words
  const tokens = content.split(/([a-zA-Z0-9'-]+)/g);
  const invalidWords = tokens.filter(
    (t) => /^[a-zA-Z0-9'-]+$/.test(t) && !isValid(t)
  );
  const uniqueInvalid = [...new Set(invalidWords)];

  isLoading.value = true;

  let processedContent = content;
  let displayContent = content;

  if (uniqueInvalid.length > 0) {
    try {
      // Get embeddings for invalid words using local browser model
      const invalidEmbeddings = await Promise.all(uniqueInvalid.map(w => getBrowserEmbedding(w)));

      const replacements: Record<string, string> = {};

      uniqueInvalid.forEach((word, idx) => {
        const emb = invalidEmbeddings[idx];
        if (emb) {
          const replacement = findClosestWord(emb);
          if (replacement) {
            replacements[word] = replacement;
            replacements[word.toLowerCase()] = replacement;
          }
        }
      });

      displayContent = tokens
        .map((t) => {
          if (/^[a-zA-Z0-9'-]+$/.test(t) && !isValid(t)) {
            const replacement = replacements[t] || replacements[t.toLowerCase()];
            if (replacement)
              return `<span class="replaced" title="${t} &rarr; ${replacement}">${replacement}</span>`;
          }
          return t;
        })
        .join('');

      // For the LLM, we send the "translated" text so it understands what we mean?
      // The user said: "LLM can just return any word".
      // Wait, the user said: "I want to essentially use RAG methods to pick the word closest in meaning to the one that needs replaced."
      // This implies the *input* to the LLM (or the display) is modified.
      // If I replace "exacerbate" with "worsen", I should send "worsen" to the LLM?
      // Yes, presumably. The goal is to "simplify text".

      processedContent = tokens
        .map((t) => {
          if (/^[a-zA-Z0-9'-]+$/.test(t) && !isValid(t)) {
            const replacement = replacements[t] || replacements[t.toLowerCase()];
            if (replacement) return replacement;
          }
          return t;
        })
        .join('');

    } catch (e) {
      console.error('Replacement failed', e);
    }
  }

  messages.value.push({ role: 'user', content: displayContent, isHtml: true })
  scrollToBottom()

  try {
    const response = await chat({
      model: selectedModel.value,
      messages: messages.value.map(m => ({ role: m.role, content: m.role === 'user' ? processedContent : m.content }))
    })
    messages.value.push(response)
    scrollToBottom()
  } catch (e) {
    console.error(e)
    messages.value.push({ role: 'assistant', content: 'Error: Failed to get response.' })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}
</script>
<style scoped>
.chat-container {
  display: flex;
  height: 80vh;
  gap: 1rem;
}

.sidebar {
  width: 250px;
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.status {
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.status.success {
  background: #d4edda;
  color: #155724;
}

.status.error {
  background: #f8d7da;
  color: #721c24;
}

.status.warning {
  background: #fff3cd;
  color: #856404;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message {
  display: flex;
  flex-direction: column;
}

.message.user {
  align-items: flex-end;
}

.message.assistant {
  align-items: flex-start;
}

.bubble {
  max-width: 70%;
  padding: 0.8rem 1rem;
  border-radius: 12px;
  background: #f1f0f0;
}

.message.user .bubble {
  background: #42b983;
  color: white;
}

.role {
  font-size: 0.8rem;
  display: block;
  margin-bottom: 0.2rem;
  opacity: 0.8;
}

.input-area {
  padding: 1rem;
  border-top: 1px solid #e9ecef;
  display: flex;
  gap: 1rem;
}

textarea {
  flex: 1;
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: none;
  height: 60px;
}

button {
  padding: 0 1.5rem;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

button:disabled {
  background: #a0dca0;
  cursor: not-allowed;
}

:deep(.replaced) {
  background-color: #ff9800;
  border-bottom: 2px solid #f57c00;
  cursor: help;
  padding: 2px 4px;
  border-radius: 2px;
}
</style>
