<template>
  <div class="transcript-view">
    <!-- Title Section -->
    <h1 v-if="transcript.title" class="text-3xl font-bold text-gray-900 mb-4">
      {{ transcript.title }}
    </h1>

    <!-- Notes Section (Collapsible) -->
    <details v-if="transcript.notes" class="mb-6">
      <summary class="cursor-pointer text-gray-700 font-semibold hover:text-gray-900">
        Notes
      </summary>
      <div class="mt-2 text-gray-600">
        {{ transcript.notes }}
      </div>
    </details>

    <!-- Turns Container -->
    <div class="turns-container space-y-2">
      <div 
        v-for="(turn, index) in transcript.turns" 
        :key="index" 
        class="turn"
      >
        <span 
          :class="['font-bold', getSpeakerColor(turn.speaker)]"
        >{{ turn.speaker }}</span>: {{ turn.text }}
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

/**
 * Deterministic color assignment for speaker names
 * Uses a hash function to consistently map speaker names to colors
 */
function getSpeakerColor(name: string): string {
  const colors = [
    'text-red-600',
    'text-blue-600',
    'text-green-600',
    'text-purple-600',
    'text-orange-600',
    'text-teal-600'
  ]
  
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]
}
</script>
