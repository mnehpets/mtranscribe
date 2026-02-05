<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getHierarchy, type HierarchyNode } from '../notion';
import NotionTreeNode from './NotionTreeNode.vue';

const props = defineProps<{
  selectedNodeId?: string | null
}>();

const emit = defineEmits<{
  select: [node: HierarchyNode]
}>();

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

function handleSelect(node: HierarchyNode) {
  emit('select', node);
}
</script>

<template>
  <div class="notion-page-selector">
    <div v-if="loading" class="text-gray-500 dark:text-gray-400">Loading Notion pages...</div>
    <div v-else-if="error" class="text-red-500 dark:text-red-400">Error: {{ error }}</div>
    
    <div v-else class="space-y-1">
      <NotionTreeNode
        v-for="node in nodes"
        :key="node.id"
        :node="node"
        :selectable="true"
        :selectedNodeId="props.selectedNodeId"
        @select="handleSelect"
      />
    </div>
  </div>
</template>
