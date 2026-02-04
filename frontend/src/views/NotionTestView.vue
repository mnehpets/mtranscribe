<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getHierarchy, type HierarchyNode } from '../notion';

import NotionTreeNode from '../components/notion/NotionTreeNode.vue';

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
    <h1 class="text-2xl font-bold mb-4">Notion Hierarchy</h1>
    
    <div v-if="loading">Loading...</div>
    <div v-else-if="error" class="text-red-500">Error: {{ error }}</div>
    
    <ul v-else class="space-y-2">
      <li v-for="node in nodes" :key="node.id">
        <NotionTreeNode :node="node" :maxLevel="4" />
      </li>
    </ul>
  </div>
</template>
