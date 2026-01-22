import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { FwbNavbarLink } from 'flowbite-vue'
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

  it('sets isActive prop on Capture route', async () => {
    const router = createRouterForTest()
    router.push('/u/')
    await router.isReady()

    const wrapper = mount(AppHeader, {
      global: {
        plugins: [router]
      }
    })

    const captureLink = wrapper.findAllComponents(FwbNavbarLink).find(c => c.text().includes('Capture'))
    expect(captureLink.props('isActive')).toBe(true)
  })

  it('sets isActive prop on Export route', async () => {
    const router = createRouterForTest()
    router.push('/u/export')
    await router.isReady()

    const wrapper = mount(AppHeader, {
      global: {
        plugins: [router]
      }
    })

    const exportLink = wrapper.findAllComponents(FwbNavbarLink).find(c => c.text().includes('Export'))
    expect(exportLink.props('isActive')).toBe(true)
  })
})
