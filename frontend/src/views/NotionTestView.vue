<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getHierarchy, type HierarchyNode } from '../notion';

import NotionTreeNode from '../components/NotionTreeNode.vue';

const nodes = ref<HierarchyNode[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    nodes.value = await getHierarchy();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Notion Hierarchy</h1>
    
    <div v-if="loading" class="text-gray-600 dark:text-gray-400">Loading...</div>
    <div v-else-if="error" class="text-red-500 dark:text-red-400">Error: {{ error }}</div>
    
    <ul v-else class="space-y-2">
      <li v-for="node in nodes" :key="node.id">
        <NotionTreeNode :node="node" :maxLevel="4" />
      </li>
    </ul>
  </div>
</template>
