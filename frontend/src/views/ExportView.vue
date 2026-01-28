<template>
  <div class="p-6">
    <div class="max-w-4xl mx-auto">
      <header class="mb-8 flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Export Transcript</h1>
          <p class="mt-2 text-gray-600">Preview and export your conversation transcript.</p>
        </div>
        <FwbButton 
          @click="downloadMarkdown"
          class="mb-1"
        >
          Download Markdown
        </FwbButton>
      </header>

      <div class="bg-white shadow rounded-lg overflow-hidden flex flex-col h-[75vh]">
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
                class="w-full h-[65vh] p-4 font-mono text-sm text-gray-800 bg-white border-none focus:ring-0 resize-none"
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
import { computed, ref } from 'vue'
import { FwbTabs, FwbTab, FwbButton } from 'flowbite-vue'
import { useRecordingSession } from '../composables/useRecordingSession'
import { MarkdownRenderer } from '../MarkdownRenderer'
import TranscriptView from '../components/TranscriptView.vue'
import { Transcript } from '../Transcript'

const { transcript } = useRecordingSession()
const renderer = new MarkdownRenderer()
const activeTab = ref('preview')

const markdownContent = computed(() => {
  // Cast to Transcript to satisfy TS private property requirements
  return renderer.render(transcript.value as unknown as Transcript)
})

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
</script>
