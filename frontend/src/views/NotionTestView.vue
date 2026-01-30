<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getHierarchy, type HierarchyNode } from '../services/notion';

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
        <details open>
            <summary class="cursor-pointer font-medium">
                <span :class="node.type === 'database' ? 'text-blue-600' : 'text-gray-800'">
                    {{ node.type === 'database' ? '🗄️' : '📄' }} {{ node.title }}
                </span>
            </summary>
            <div class="pl-6 mt-1 border-l-2 border-gray-200" v-if="node.children.length">
                <div v-for="child in node.children" :key="child.id" class="py-1">
                     {{ child.type === 'database' ? '🗄️' : '📄' }} {{ child.title }}
                </div>
            </div>
        </details>
      </li>
    </ul>
  </div>
</template>
