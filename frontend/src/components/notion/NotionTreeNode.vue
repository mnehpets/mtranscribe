<script setup lang="ts">
import IconMdiDatabaseOutline from '~icons/mdi/database-outline';
import IconMdiDatabaseSearchOutline from '~icons/mdi/database-search-outline';
import IconMdiFileDocumentOutline from '~icons/mdi/file-document-outline';

import type { HierarchyNode } from '../../notion';

const props = withDefaults(
  defineProps<{
  node: HierarchyNode;
  level?: number;
  maxLevel?: number;
  }>(),
  {
    level: 1,
    maxLevel: 4,
  },
);

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
</script>

<template>
  <div :class="level === 1 ? '' : 'py-1'">
    <details v-if="canExpand()" open>
      <summary :class="level === 1 ? 'cursor-pointer font-medium' : 'cursor-pointer'">
        <component :is="iconFor(node.type)" class="inline-block w-4 h-4 mr-1 align-text-bottom" />
        {{ node.title }}
      </summary>

      <div class="pl-6 mt-1 border-l-2 border-gray-200">
        <NotionTreeNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :iconFor="iconFor"
          :level="level + 1"
          :maxLevel="maxLevel"
        />
      </div>
    </details>

    <div v-else>
      <component :is="iconFor(node.type)" class="inline-block w-4 h-4 mr-1 align-text-bottom" />
      {{ node.title }}
    </div>
  </div>
</template>
