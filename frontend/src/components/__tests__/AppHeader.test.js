import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppHeader from '../AppHeader.vue'
import AppLayout from '../../layouts/AppLayout.vue'
import CaptureView from '../../views/CaptureView.vue'
import ExportView from '../../views/ExportView.vue'
import SettingsView from '../../views/SettingsView.vue'

describe('AppHeader', () => {
  const createRouterForTest = () => {
    return createRouter({
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
  }

  it('renders the logo and navigation tabs', async () => {
    const router = createRouterForTest()
    router.push('/u')
    await router.isReady()

    const wrapper = mount(AppHeader, {
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.text()).toContain('mtranscribe')
    expect(wrapper.text()).toContain('Capture')
    expect(wrapper.text()).toContain('Export')
    expect(wrapper.text()).toContain('Settings')
  })

  it('highlights the active tab on Capture route', async () => {
    const router = createRouterForTest()
    router.push('/u/')
    await router.isReady()

    const wrapper = mount(AppHeader, {
      global: {
        plugins: [router]
      }
    })

    const captureLink = wrapper.findAll('a').find(link => link.text() === 'Capture')
    expect(captureLink.classes()).toContain('text-blue-600')
  })

  it('highlights the active tab on Export route', async () => {
    const router = createRouterForTest()
    router.push('/u/export')
    await router.isReady()

    const wrapper = mount(AppHeader, {
      global: {
        plugins: [router]
      }
    })

    const exportLink = wrapper.findAll('a').find(link => link.text() === 'Export')
    expect(exportLink.classes()).toContain('text-blue-600')
  })
})
