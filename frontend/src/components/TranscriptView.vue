<template>
  <div v-if="transcript" class="transcript-view">
    <!-- Title -->
    <h1 v-if="transcript.title" class="text-2xl font-bold text-gray-900 mb-4">
      {{ transcript.title }}
    </h1>

    <!-- Notes (collapsible) -->
    <details v-if="transcript.notes" class="mb-4">
      <summary class="cursor-pointer text-gray-700 font-medium">Notes</summary>
      <div class="mt-2 text-gray-600 pl-4">
        {{ transcript.notes }}
      </div>
    </details>

    <!-- Turns -->
    <div class="turns-container">
      <div
        v-for="(turn, index) in transcript.turns"
        :key="index"
        class="turn mb-1"
      >
        <span :class="[getSpeakerColor(turn.speaker), 'font-bold']">
          {{ turn.speaker }}
        </span>:
        {{ turn.text }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Transcript } from '../Transcript'

interface Props {
  transcript: Transcript
}

const props = defineProps<Props>()

const colors = [
  'text-red-600',
  'text-blue-600',
  'text-green-600',
  'text-purple-600',
  'text-orange-600',
  'text-teal-600',
]

function getSpeakerColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]
}
</script>
