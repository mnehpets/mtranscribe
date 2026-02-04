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

      <div class="pt-6 border-t border-gray-200">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Integrations</h3>
        
        <div class="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <!-- Notion Icon -->
              <icon-simple-icons-notion class="w-8 h-8" />
            </div>
            <div>
              <h4 class="text-sm font-medium text-gray-900">Notion</h4>
              <p class="text-sm text-gray-500">
                {{ isNotionConnected ? 'Connected to Notion' : 'Connect to save transcripts' }}
              </p>
            </div>
          </div>
          
          <fwb-button
            v-if="!isNotionConnected"
            @click="connectNotion"
            :loading="isLoggingIn"
            :disabled="isCheckingAuth || isLoggingIn"
            color="alternative"
          >
            Connect
          </fwb-button>
          <div v-else class="text-green-600 font-medium text-sm flex items-center">
            <icon-mdi-check class="w-5 h-5 mr-1" />
            Connected
          </div>
        </div>

        <div v-if="authError" class="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
          {{ authError }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { FwbInput, FwbButton } from 'flowbite-vue'
import IconSimpleIconsNotion from '~icons/simple-icons/notion'
import IconMdiCheck from '~icons/mdi/check'
import { AppConfig } from '../Config'
import { AuthService, AuthError } from '../AuthService'

const apiKey = ref('')
const config = AppConfig.getInstance()
const authService = AuthService.getInstance()

const isAuthenticated = ref(false)
const isNotionConnected = ref(false)
const isCheckingAuth = ref(true)
const isLoggingIn = ref(false)
const authError = ref('')

const checkAuth = async () => {
  isCheckingAuth.value = true
  try {
    isAuthenticated.value = await authService.checkAuth()
    isNotionConnected.value = authService.hasService('notion')
  } catch (error) {
    console.error('Failed to check auth status:', error)
  } finally {
    isCheckingAuth.value = false
  }
}

const connectNotion = async () => {
  isLoggingIn.value = true
  authError.value = ''
  try {
    await authService.loginWithPopup()
    await checkAuth()
  } catch (error) {
    console.error('Login failed:', error)
    if (error instanceof AuthError) {
      authError.value = error.message
    } else if (error instanceof Error) {
      authError.value = error.message
    } else {
      authError.value = 'An unexpected error occurred during login'
    }
  } finally {
    isLoggingIn.value = false
  }
}

onMounted(() => {
  apiKey.value = config.deepgramApiKey
  checkAuth()
})

watch(apiKey, (newValue) => {
  config.deepgramApiKey = newValue
  config.save()
})
</script>
