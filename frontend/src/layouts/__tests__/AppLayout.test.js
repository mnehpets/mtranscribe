import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppLayout from '../AppLayout.vue'
import CaptureView from '../../views/CaptureView.vue'

describe('AppLayout', () => {
  it('renders the header and content', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/u',
          component: AppLayout,
          children: [
            { path: '', component: CaptureView }
          ]
        }
      ]
    })

    router.push('/u')
    await router.isReady()

    const wrapper = mount(AppLayout, {
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.text()).toContain('mtranscribe')
    expect(wrapper.find('header').exists()).toBe(true)
  })
})
