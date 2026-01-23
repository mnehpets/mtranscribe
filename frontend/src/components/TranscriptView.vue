<template>
  <div class="transcript-view">
    <!-- Title Section -->
    <h1 v-if="transcript.title" class="text-3xl font-bold text-gray-900 mb-4">
      {{ transcript.title }}
    </h1>

    <!-- Summary and Notes Accordion -->
    <FwbAccordion flush v-if="transcript.summary || transcript.notes" class="mb-6">
      <FwbAccordionPanel v-if="transcript.summary">
        <FwbAccordionHeader>Summary</FwbAccordionHeader>
        <FwbAccordionContent>
          <div class="text-gray-700 italic">
            {{ transcript.summary }}
          </div>
        </FwbAccordionContent>
      </FwbAccordionPanel>
      
      <FwbAccordionPanel v-if="transcript.notes">
        <FwbAccordionHeader>Notes</FwbAccordionHeader>
        <FwbAccordionContent>
          <div class="text-gray-600">
            {{ transcript.notes }}
          </div>
        </FwbAccordionContent>
      </FwbAccordionPanel>
    </FwbAccordion>

    <!-- Turns Container -->
    <div class="turns-container space-y-2">
      <div 
        v-for="(turn, index) in transcript.turns" 
        :key="index" 
        class="turn flex gap-3"
      >
        <div class="flex items-start gap-1 pt-1 min-w-[4.5rem]">
          <div class="text-xs text-gray-400 font-mono select-none">
            {{ formatTime(turn.timestamp) }}
          </div>
          <Icon 
            :icon="getSourceIcon(turn.source)" 
            class="text-gray-300 text-xs mt-0.5" 
            :title="turn.source"
          />
        </div>
        <div class="flex-1">
          <span 
            :class="['font-bold', getSpeakerColor(turn.speaker)]"
          >{{ turn.speaker }}</span>: {{ turn.text }}
          <span v-if="turn.interim" class="text-gray-500 italic">{{ turn.interim }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Transcript, TurnSource } from '../Transcript'
import { Icon } from '@iconify/vue'
import {
  FwbAccordion,
  FwbAccordionPanel,
  FwbAccordionHeader,
  FwbAccordionContent,
} from 'flowbite-vue'

interface Props {
  transcript: Transcript
}

defineProps<Props>()

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function getSourceIcon(source?: TurnSource): string {
  switch (source) {
    case 'typed':
      return 'mdi:keyboard-outline'
    case 'generated':
      return 'mdi:robot-outline'
    case 'transcribed':
    default:
      return 'mdi:microphone-outline'
  }
}

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
