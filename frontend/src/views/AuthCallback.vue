<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <div v-if="status.progress === 'processing'" class="mb-4">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">Processing authentication...</p>
      </div>
      <div v-else-if="status.success" class="mb-4">
        <p class="text-gray-600">Authentication successful!</p>
        <p class="text-sm text-gray-500 mt-2">This window will close automatically...</p>
      </div>
      <div v-else class="mb-4">
        <p class="text-gray-600">Authentication failed</p>
        <p class="text-sm font-mono bg-red-50 text-red-700 px-2 py-1 rounded mt-2 inline-block">
          {{ status.errorCode }}
        </p>
        <p class="text-sm text-gray-600 mt-2 max-w-md mx-auto">
          {{ status.errorDescription }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const status = ref<{
    type: 'auth-result',
    progress: 'processing' | 'complete',
    success: boolean,
    errorCode: string | undefined,
    errorDescription: string | undefined
  }>({
    type: 'auth-result',
    progress: 'processing',
    success: false,
    errorCode: '',
    errorDescription: ''
  });

onMounted(() => {
  // Get query parameters
  status.value = {
    type: 'auth-result',
    progress: 'complete',
    success: route.query.success === 'true',
    errorCode: (route.query.error as string) || undefined,
    errorDescription: (route.query.error_description as string) || undefined
  }

  // Send result to parent window via BroadcastChannel
  const channel = new BroadcastChannel('auth_channel');
  // Clone the object to ensure it's serializable and remove any Vue reactivity
  channel.postMessage(JSON.parse(JSON.stringify(status.value)));
  channel.close();

  // Close the popup after a short delay to allow the message to be sent
  setTimeout(() => {
    window.close();
  }, 1500);
});
</script>
