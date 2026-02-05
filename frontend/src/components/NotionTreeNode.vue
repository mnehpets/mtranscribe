<script setup lang="ts">
import IconMdiDatabaseOutline from '~icons/mdi/database-outline';
import IconMdiDatabaseSearchOutline from '~icons/mdi/database-search-outline';
import IconMdiFileDocumentOutline from '~icons/mdi/file-document-outline';

import type { HierarchyNode } from '../notion';

const props = withDefaults(
  defineProps<{
  node: HierarchyNode;
  level?: number;
  maxLevel?: number;
  selectable?: boolean;
  selectedNodeId?: string | null;
  }>(),
  {
    level: 1,
    maxLevel: 4,
    selectable: false,
    selectedNodeId: null,
  },
);

const emit = defineEmits<{
  select: [node: HierarchyNode]
}>();

function iconFor(type: HierarchyNode['type']) {
  switch (type) {
    case 'data_source':
      return IconMdiDatabaseSearchOutline;
    case 'database':
      return IconMdiDatabaseOutline;
    default:
      return IconMdiFileDocumentOutline;
  }
}

function canExpand() {
  return props.level < props.maxLevel && props.node.children.length > 0;
}

function isOpenByDefault(node: HierarchyNode) {
  // Datasources have a large number of children, so keep them closed by default.
  return node.type !== 'data_source';
}

function handleClick(event: Event) {
  if (props.selectable) {
    event.preventDefault();
    emit('select', props.node);
  }
}

</script>

<template>
  <div :class="level === 1 ? '' : 'py-1'">
    <details v-if="canExpand()" class="text-gray-900 dark:text-white" :open="isOpenByDefault(node)">
      <summary 
        :class="[
          'cursor-pointer',
          level === 1 ? 'font-medium' : '',
          selectable ? 'p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center' : '',
          selectable && selectedNodeId === node.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
        ]"
        @click="handleClick"
      >
        <component 
          :is="iconFor(node.type)" 
          :class="selectable ? 'w-4 h-4 mr-2 flex-shrink-0 text-gray-600 dark:text-gray-400' : 'inline-block w-4 h-4 mr-1 align-text-bottom text-gray-600 dark:text-gray-400'" 
        />
        <span :class="selectable ? 'truncate' : ''">{{ node.title }}</span>
      </summary>

      <div class="pl-6 mt-1 border-l-2 border-gray-200 dark:border-gray-600">
        <NotionTreeNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :level="level + 1"
          :maxLevel="maxLevel"
          :selectable="selectable"
          :selectedNodeId="selectedNodeId"
          @select="emit('select', $event)"
        />
      </div>
    </details>

    <div 
      v-else
      :class="[
        'text-gray-900 dark:text-white',
        selectable ? 'cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center' : '',
        selectable && selectedNodeId === node.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
      ]"
      @click="handleClick"
    >
      <component 
        :is="iconFor(node.type)" 
        :class="selectable ? 'w-4 h-4 mr-2 flex-shrink-0 text-gray-600 dark:text-gray-400' : 'inline-block w-4 h-4 mr-1 align-text-bottom text-gray-600 dark:text-gray-400'" 
      />
      <span :class="selectable ? 'truncate' : ''">{{ node.title }}</span>
    </div>
  </div>
</template>
