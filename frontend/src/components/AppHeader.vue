<template>
  <header class="bg-white border-b border-gray-200">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center">
          <h1 class="text-xl font-bold text-gray-900">mtranscribe</h1>
        </div>
        <nav class="flex space-x-8">
          <RouterLink
            to="/u/"
            class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
            :class="isActive('/u/') ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Capture
          </RouterLink>
          <RouterLink
            to="/u/export"
            class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
            :class="isActive('/u/export') ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Export
          </RouterLink>
          <RouterLink
            to="/u/settings"
            class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
            :class="isActive('/u/settings') ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
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
  if (path === '/u/') {
    return route.path === '/u/' || route.path === '/u'
  }
  return route.path === path
}
</script>
