<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h2>
    
    <div class="max-w-md space-y-6">
      <fwb-input
        v-model="apiKey"
        label="Deepgram API Key"
        placeholder="Enter your API key"
        type="password"
      />

      <div class="pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Integrations</h3>
        
        <div class="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <!-- Notion Icon -->
              <icon-simple-icons-notion class="w-8 h-8" />
            </div>
            <div>
              <h4 class="text-sm font-medium text-gray-900 dark:text-white">Notion</h4>
              <p class="text-sm text-gray-500 dark:text-gray-400">
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

        <div v-if="authError" class="mt-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
          {{ authError }}
        </div>

        <!-- Notion Export Destination Section -->
        <div v-if="isNotionConnected" class="mt-6 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Export Destination</h4>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Select a default location in Notion where transcripts will be exported.
          </p>

          <div v-if="notionExportDestination" class="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <icon-mdi-check-circle class="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ notionExportDestination }}</span>
            </div>
            <fwb-button size="xs" color="alternative" @click="showDestinationSelector = true">
              Change
            </fwb-button>
          </div>

          <fwb-button 
            v-else
            @click="showDestinationSelector = true"
            color="alternative"
            size="sm"
          >
            Select Destination
          </fwb-button>

          <!-- Destination Selector Modal -->
          <fwb-modal v-if="showDestinationSelector" @close="showDestinationSelector = false">
            <template #header>
              <div class="text-lg font-medium text-gray-900 dark:text-white">
                Select Notion Destination
              </div>
            </template>
            <template #body>
              <div class="max-h-[60vh] overflow-y-auto">
                <NotionPageSelector :selectedNodeId="notionExportDestinationId" @select="handleDestinationSelect" />
              </div>
            </template>
          </fwb-modal>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { FwbInput, FwbButton, FwbModal } from 'flowbite-vue'
import IconSimpleIconsNotion from '~icons/simple-icons/notion'
import IconMdiCheck from '~icons/mdi/check'
import IconMdiCheckCircle from '~icons/mdi/check-circle'
import { AppConfig } from '../Config'
import { AuthService, AuthError } from '../AuthService'
import NotionPageSelector from '../components/NotionPageSelector.vue'
import type { HierarchyNode } from '../notion'

const apiKey = ref('')
const config = AppConfig.getInstance()
const authService = AuthService.getInstance()

const isAuthenticated = ref(false)
const isNotionConnected = ref(false)
const isCheckingAuth = ref(true)
const isLoggingIn = ref(false)
const authError = ref('')
const showDestinationSelector = ref(false)

const notionExportDestination = ref(config.notionExportDestinationTitle)
const notionExportDestinationId = ref(config.notionExportDestinationId)

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

const handleDestinationSelect = (node: HierarchyNode) => {
  notionExportDestinationId.value = node.id
  notionExportDestination.value = node.title
  config.notionExportDestinationId = node.id
  config.notionExportDestinationTitle = node.title
  config.save()
  showDestinationSelector.value = false
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
