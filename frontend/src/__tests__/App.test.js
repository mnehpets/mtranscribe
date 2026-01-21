import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import AppLayout from '../components/AppLayout.vue'
import CaptureView from '../views/CaptureView.vue'
import ExportView from '../views/ExportView.vue'
import SettingsView from '../views/SettingsView.vue'

// Create a test router
const createTestRouter = () => {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/u',
        component: AppLayout,
        children: [
          { path: '', component: CaptureView },
          { path: 'export', component: ExportView },
          { path: 'settings', component: SettingsView }
        ]
      }
    ]
  })
}

describe('App', () => {
  it('renders the router view', async () => {
    const router = createTestRouter()
    await router.push('/u/')
    await router.isReady()
    
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    })
    
    expect(wrapper.html()).toContain('mtranscribe')
  })
})
