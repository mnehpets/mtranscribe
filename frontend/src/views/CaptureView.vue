<template>
  <div class="p-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-4">Capture</h2>
    <TranscriptView :transcript="transcript" />
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import TranscriptView from '../components/TranscriptView.vue';
import { Transcript } from '../Transcript';

const now = new Date();
const transcript = reactive(new Transcript(
  'Weekly Sync',
  'Weekly team synchronization meeting to discuss progress and blockers.',
  'Remember to update the Jira board.',
  [
    {
      speaker: 'Alice',
      text: 'Good morning everyone, let\'s start with the updates.',
      timestamp: new Date(now.getTime() - 60000 * 5),
      interim: ''
    },
    {
      speaker: 'Bob',
      text: 'I have finished the user authentication module.',
      timestamp: new Date(now.getTime() - 60000 * 4),
      interim: ''
    },
    {
      speaker: 'Alice',
      text: 'That is great news, Bob. Any blockers?',
      timestamp: new Date(now.getTime() - 60000 * 3),
      interim: ''
    },
    {
      speaker: 'Bob',
      text: 'No blockers at the moment.',
      timestamp: new Date(now.getTime() - 60000 * 2),
      interim: ''
    },
    {
      speaker: 'Charlie',
      text: 'I am working on the frontend integration.',
      timestamp: new Date(now.getTime() - 60000 * 1),
      interim: ''
    },
    {
      speaker: 'Alice',
      text: 'Excellent. Let\'s keep pushing.',
      timestamp: now,
      interim: ''
    }
  ]
));
</script>
