<template>
  <div class="p-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-4">Capture</h2>
    <TranscriptView :transcript="transcript" />
  </div>
</template>

<script setup lang="ts">
import TranscriptView from '../components/TranscriptView.vue';
import { useRecordingSession } from '../composables/useRecordingSession';

const { transcript } = useRecordingSession();
</script>
