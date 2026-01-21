import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppHeader from '../AppHeader.vue'
import AppLayout from '../AppLayout.vue'
import CaptureView from '../../views/CaptureView.vue'
import ExportView from '../../views/ExportView.vue'
import SettingsView from '../../views/SettingsView.vue'

const createTestRouter = () => {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/u',
        component: { template: '<div><slot /></div>' },
        children: [
          { path: '', component: CaptureView },
          { path: 'export', component: ExportView },
          { path: 'settings', component: SettingsView }
        ]
      }
    ]
  })
}

describe('AppHeader', () => {
  it('renders the app title', async () => {
    const router = createTestRouter()
    await router.push('/u/')
    await router.isReady()
    
    const wrapper = mount(AppHeader, {
      global: { plugins: [router] }
    })
    
    expect(wrapper.text()).toContain('mtranscribe')
  })
  
  it('renders navigation tabs', async () => {
    const router = createTestRouter()
    await router.push('/u/')
    await router.isReady()
    
    const wrapper = mount(AppHeader, {
      global: { plugins: [router] }
    })
    
    expect(wrapper.text()).toContain('Capture')
    expect(wrapper.text()).toContain('Export')
    expect(wrapper.text()).toContain('Settings')
  })
  
  it('highlights active tab', async () => {
    const router = createTestRouter()
    await router.push('/u/')
    await router.isReady()
    
    const wrapper = mount(AppHeader, {
      global: { plugins: [router] }
    })
    
    const captureLink = wrapper.find('a[href="/u/"]')
    expect(captureLink.classes()).toContain('border-blue-500')
  })
})

describe('AppLayout', () => {
  it('renders the header and router view', async () => {
    const router = createTestRouter()
    await router.push('/u/')
    await router.isReady()
    
    const wrapper = mount(AppLayout, {
      global: { plugins: [router] }
    })
    
    expect(wrapper.html()).toContain('mtranscribe')
  })
})
