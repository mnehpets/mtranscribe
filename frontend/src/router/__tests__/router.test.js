import { describe, it, expect, beforeEach } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppLayout from '../../layouts/AppLayout.vue'
import CaptureView from '../../views/CaptureView.vue'
import ExportView from '../../views/ExportView.vue'
import SettingsView from '../../views/SettingsView.vue'

describe('Router', () => {
  let router

  beforeEach(() => {
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/u',
          component: AppLayout,
          children: [
            { path: '', name: 'capture', component: CaptureView },
            { path: 'export', name: 'export', component: ExportView },
            { path: 'settings', name: 'settings', component: SettingsView }
          ]
        }
      ]
    })
  })

  it('navigates to CaptureView at /u/', async () => {
    router.push('/u/')
    await router.isReady()
    
    const route = router.currentRoute.value
    expect(route.path).toBe('/u/')
    expect(route.name).toBe('capture')
  })

  it('navigates to ExportView at /u/export', async () => {
    router.push('/u/export')
    await router.isReady()
    
    const route = router.currentRoute.value
    expect(route.path).toBe('/u/export')
    expect(route.name).toBe('export')
  })

  it('navigates to SettingsView at /u/settings', async () => {
    router.push('/u/settings')
    await router.isReady()
    
    const route = router.currentRoute.value
    expect(route.path).toBe('/u/settings')
    expect(route.name).toBe('settings')
  })
})
