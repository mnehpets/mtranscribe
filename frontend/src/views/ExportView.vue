<template>
  <div class="p-6">
    <div class="max-w-4xl mx-auto">
      <header class="mb-8 flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Export Transcript</h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">Preview and export your conversation transcript.</p>
        </div>
        <div class="flex gap-2 mb-1">
          <FwbButton 
            @click="exportToNotion"
            :disabled="!canExportToNotion"
            :loading="isExportingToNotion"
            color="blue"
          >
            Export to Notion
          </FwbButton>
          <FwbButton 
            @click="downloadMarkdown"
            color="alternative"
          >
            Download Markdown
          </FwbButton>
        </div>
      </header>

      <!-- Export status messages -->
      <div v-if="exportError" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-sm text-red-600">{{ exportError }}</p>
      </div>

      <div v-if="exportSuccess" class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <icon-mdi-check-circle class="w-5 h-5 text-green-600" />
          <p class="text-sm text-green-600">Successfully exported to Notion!</p>
        </div>
        <a v-if="notionPageUrl" :href="notionPageUrl" target="_blank" class="text-sm text-blue-600 hover:underline">
          View in Notion →
        </a>
      </div>

      <div v-if="!isNotionConnected && !canExportToNotion" class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p class="text-sm text-yellow-800">
          Connect Notion in 
          <router-link to="/u/settings" class="font-medium underline">Settings</router-link>
          to enable Notion export.
        </p>
      </div>

      <div v-if="isNotionConnected && !hasNotionDestination" class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p class="text-sm text-yellow-800">
          Select an export destination in 
          <router-link to="/u/settings" class="font-medium underline">Settings</router-link>
          to enable Notion export.
        </p>
      </div>

      <div class="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden flex flex-col h-[75vh]">
        <FwbTabs v-model="activeTab" variant="underline" class="flex-1 flex flex-col">
          <FwbTab name="preview" title="Preview">
            <div class="p-6 h-full overflow-auto">
              <TranscriptView :transcript="transcript" />
            </div>
          </FwbTab>
          <FwbTab name="markdown" title="Markdown Source">
            <div class="h-full p-0">
              <textarea 
                readonly 
                class="w-full h-[65vh] p-4 font-mono text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 border-none focus:ring-0 resize-none"
                :value="markdownContent"
              ></textarea>
            </div>
          </FwbTab>
        </FwbTabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { FwbTabs, FwbTab, FwbButton } from 'flowbite-vue'
import IconMdiCheckCircle from '~icons/mdi/check-circle'
import { useRecordingSession } from '../composables/useRecordingSession'
import { MarkdownRenderer } from '../MarkdownRenderer'
import TranscriptView from '../components/TranscriptView.vue'
import { Transcript } from '../Transcript'
import { AppConfig } from '../Config'
import { AuthService } from '../AuthService'
import { notion } from '../notion'
import { transcriptToNotionBlocks, chunkBlocks } from '../notionUtils'

const { transcript } = useRecordingSession()
const renderer = new MarkdownRenderer()
const activeTab = ref('preview')
const config = AppConfig.getInstance()
const authService = AuthService.getInstance()

const isNotionConnected = ref(false)
const isExportingToNotion = ref(false)
const exportError = ref('')
const exportSuccess = ref(false)
const notionPageUrl = ref('')

const hasNotionDestination = computed(() => !!config.notionExportDestinationId)

const canExportToNotion = computed(() => {
  return isNotionConnected.value && hasNotionDestination.value && !isExportingToNotion.value
})

const markdownContent = computed(() => {
  // Cast to Transcript to satisfy TS private property requirements
  return renderer.render(transcript.value as unknown as Transcript)
})

async function checkNotionAuth() {
  try {
    await authService.checkAuth()
    isNotionConnected.value = authService.hasService('notion')
  } catch (error) {
    console.error('Failed to check Notion auth:', error)
  }
}

async function exportToNotion() {
  if (!canExportToNotion.value) return

  isExportingToNotion.value = true
  exportError.value = ''
  exportSuccess.value = false
  notionPageUrl.value = ''

  try {
    // Create the title for the page
    const title = transcript.value.title || 'Untitled Transcript'
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    const pageTitle = `${title} - ${date}`

    // Convert transcript to Notion blocks
    const blocks = transcriptToNotionBlocks(transcript.value as unknown as Transcript)
    const blockChunks = chunkBlocks(blocks)

    // Create the page
    const parentId = config.notionExportDestinationId
    const response = await notion.pages.create({
      parent: { page_id: parentId },
      properties: {
        title: {
          title: [{ type: 'text', text: { content: pageTitle } }]
        }
      },
      children: blockChunks[0] || []
    })

    // If there are more chunks, append them
    if (blockChunks.length > 1) {
      for (let i = 1; i < blockChunks.length; i++) {
        await notion.blocks.children.append({
          block_id: response.id,
          children: blockChunks[i]
        })
      }
    }

    // Success!
    exportSuccess.value = true
    notionPageUrl.value = response.url

    // Clear success message after 10 seconds
    setTimeout(() => {
      exportSuccess.value = false
    }, 10000)
  } catch (error) {
    console.error('Failed to export to Notion:', error)
    if (error instanceof Error) {
      exportError.value = `Export failed: ${error.message}`
    } else {
      exportError.value = 'An unexpected error occurred while exporting to Notion'
    }
  } finally {
    isExportingToNotion.value = false
  }
}

function downloadMarkdown() {
  const blob = new Blob([markdownContent.value], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  
  // Create a filename with timestamp
  const date = new Date().toISOString().slice(0, 10)
  const title = transcript.value.title 
    ? transcript.value.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') 
    : 'transcript'
  a.download = `${title}-${date}.md`
  
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(() => {
  checkNotionAuth()
})
</script>
