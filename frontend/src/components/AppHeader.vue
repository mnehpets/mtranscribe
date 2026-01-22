<template>
  <header class="bg-white border-b border-gray-200">
    <div class="px-4 mx-auto max-w-7xl">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center">
          <h1 class="text-xl font-bold text-gray-900">mtranscribe</h1>
        </div>
        <nav class="flex space-x-1">
          <RouterLink
            to="/u/"
            class="px-4 py-2 text-sm font-medium rounded-t-lg"
            :class="isActive('/u/') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
          >
            Capture
          </RouterLink>
          <RouterLink
            to="/u/export"
            class="px-4 py-2 text-sm font-medium rounded-t-lg"
            :class="isActive('/u/export') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
          >
            Export
          </RouterLink>
          <RouterLink
            to="/u/settings"
            class="px-4 py-2 text-sm font-medium rounded-t-lg"
            :class="isActive('/u/settings') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
          >
            Settings
          </RouterLink>
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

const isActive = (path) => {
  return computed(() => {
    if (path === '/u/') {
      return route.path === '/u/' || route.path === '/u'
    }
    return route.path.startsWith(path)
  }).value
}
</script>
