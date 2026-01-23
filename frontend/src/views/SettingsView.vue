<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
    
    <div class="max-w-md space-y-6">
      <fwb-input
        v-model="apiKey"
        label="Deepgram API Key"
        placeholder="Enter your API key"
        type="password"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { FwbInput } from 'flowbite-vue'
import { AppConfig } from '../Config'

const apiKey = ref('')
const config = AppConfig.getInstance()

onMounted(() => {
  apiKey.value = config.deepgramApiKey
})

watch(apiKey, (newValue) => {
  config.deepgramApiKey = newValue
  config.save()
})
</script>
