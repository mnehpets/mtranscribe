<template>
  <fwb-navbar class="sticky top-0 z-50">
    <template #logo>
      <div class="flex items-center">
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">mtranscribe</h1>
      </div>
    </template>
    <template #default="{ isShowMenu }">
      <fwb-navbar-collapse :is-show-menu="isShowMenu">
        <fwb-navbar-link
          component="router-link"
          link-attr="to"
          link="/u/"
          :is-active="isActive('/u/')"
        >
          Capture
        </fwb-navbar-link>
        <fwb-navbar-link
          component="router-link"
          link-attr="to"
          link="/u/export"
          :is-active="isActive('/u/export')"
        >
          Export
        </fwb-navbar-link>
        <fwb-navbar-link
          component="router-link"
          link-attr="to"
          link="/u/settings"
          :is-active="isActive('/u/settings')"
        >
          Settings
        </fwb-navbar-link>
      </fwb-navbar-collapse>
    </template>
    <template #right-side>
      <AudioCaptureControl />
    </template>
  </fwb-navbar>
</template>

<script setup>
import {
  FwbNavbar,
  FwbNavbarCollapse,
  FwbNavbarLink,
} from 'flowbite-vue'
import { useRoute } from 'vue-router'
import AudioCaptureControl from './AudioCaptureControl.vue'

const route = useRoute()

const isActive = (path) => {
  if (path === '/u/') {
    return route.path === '/u/' || route.path === '/u'
  }
  return route.path.startsWith(path)
}
</script>
