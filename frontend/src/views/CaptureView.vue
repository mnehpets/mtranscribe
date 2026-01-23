<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h2 class="text-2xl font-bold text-gray-900 mb-4">Capture</h2>
    <TranscriptView :transcript="(transcript as unknown as Transcript)" />
  </div>
</template>

<script setup lang="ts">
import TranscriptView from '../components/TranscriptView.vue';
import { useRecordingSession } from '../composables/useRecordingSession';
import { Transcript } from '../Transcript';

const { transcript } = useRecordingSession();
</script>
