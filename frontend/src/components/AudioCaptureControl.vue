<template>
  <div class="flex flex-col gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between w-full gap-4">
      <div class="flex gap-1">
        <!-- Pause/Resume Button -->
        <fwb-button
          color="light"
          size="sm"
          pill
          square
          :disabled="status === 'idle'"
          @click="togglePause"
          :title="status === 'paused' ? 'Resume Recording' : 'Pause Recording'"
        >
          <Icon :icon="status === 'paused' ? 'mdi:play' : 'mdi:pause'" class="w-5 h-5" />
        </fwb-button>

        <!-- Record/Stop Button -->
        <fwb-button
          :color="status === 'idle' ? 'green' : 'red'"
          size="sm"
          pill
          square
          @click="toggleRecording"
          :title="status === 'idle' ? 'Start Recording' : 'Stop Recording'"
        >
          <Icon :icon="status === 'idle' ? 'mdi:microphone' : 'mdi:stop'" class="w-5 h-5" />
        </fwb-button>
      </div>

      <!-- Status Indicator -->
      <div class="flex items-center gap-2 text-sm font-medium min-w-[4rem] justify-end">
        <span v-if="status === 'recording'" class="flex items-center text-red-600 animate-pulse">
          <span class="w-2 h-2 mr-1 bg-red-600 rounded-full"></span>
          REC
        </span>
        <span v-else-if="status === 'paused'" class="text-yellow-600">
          PAUSED
        </span>
        <span v-else class="text-gray-400 dark:text-gray-500">
          IDLE
        </span>
      </div>
    </div>

    <VuMeter
      :media-stream="mediaStream"
      :enabled="status !== 'idle'"
      class="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { FwbButton } from 'flowbite-vue'
import { Icon } from '@iconify/vue'
import VuMeter from './VuMeter.vue'

// Defines the possible states of the capture controller
type CaptureStatus = 'idle' | 'recording' | 'paused'

const status = ref<CaptureStatus>('idle')
const mediaStream = ref<MediaStream | null>(null)

const toggleRecording = async () => {
  if (status.value === 'idle') {
    await startRecording()
  } else {
    stopRecording()
  }
}

const togglePause = () => {
  if (status.value === 'recording') {
    pauseRecording()
  } else if (status.value === 'paused') {
    resumeRecording()
  }
}

const startRecording = async () => {
  try {
    // In a real implementation, this would call the controller
    // For now, we simulate getting a stream
    mediaStream.value = await navigator.mediaDevices.getUserMedia({ audio: true })
    status.value = 'recording'
  } catch (err) {
    console.error('Failed to start recording:', err)
  }
}

const pauseRecording = () => {
  status.value = 'paused'
  // Controller logic here
}

const resumeRecording = () => {
  status.value = 'recording'
  // Controller logic here
}

const stopRecording = () => {
  status.value = 'idle'
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach(track => track.stop())
    mediaStream.value = null
  }
  // Controller logic here
}
</script>
