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
          :disabled="state === 'idle'"
          @click="togglePause"
          :title="state === 'muted' ? 'Resume Recording' : 'Pause Recording'"
        >
          <component :is="state === 'muted' ? IconMdiPlay : IconMdiPause" class="w-5 h-5" />
        </fwb-button>

        <!-- Record/Stop Button -->
        <fwb-button
          :color="state === 'idle' ? 'green' : 'red'"
          size="sm"
          pill
          square
          @click="toggleRecording"
          :title="state === 'idle' ? 'Start Recording' : 'Stop Recording'"
        >
          <component :is="state === 'idle' ? IconMdiMicrophone : IconMdiStop" class="w-5 h-5" />
        </fwb-button>
      </div>

      <!-- Status Indicator -->
      <div class="flex items-center gap-2 text-sm font-medium min-w-[4rem] justify-end">
        <span v-if="state === 'capturing'" class="flex items-center text-red-600 animate-pulse">
          <span class="w-2 h-2 mr-1 bg-red-600 rounded-full"></span>
          REC
        </span>
        <span v-else-if="state === 'muted'" class="text-yellow-600">
          PAUSED
        </span>
        <span v-else class="text-gray-400 dark:text-gray-500">
          IDLE
        </span>
      </div>
    </div>

    <VuMeter
      :media-stream="stream"
      :enabled="state !== 'idle'"
      class="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden"
    />
  </div>
</template>

<script setup lang="ts">
import { FwbButton } from 'flowbite-vue'
import VuMeter from './VuMeter.vue'
import { useRecordingSession } from '../composables/useRecordingSession'
import IconMdiPlay from '~icons/mdi/play'
import IconMdiPause from '~icons/mdi/pause'
import IconMdiMicrophone from '~icons/mdi/microphone'
import IconMdiStop from '~icons/mdi/stop'

const { state, stream, start, stop, mute, unmute } = useRecordingSession()

const toggleRecording = async () => {
  if (state.value === 'idle') {
    await start()
  } else {
    stop()
  }
}

const togglePause = () => {
  if (state.value === 'capturing') {
    mute()
  } else if (state.value === 'muted') {
    unmute()
  }
}
</script>
