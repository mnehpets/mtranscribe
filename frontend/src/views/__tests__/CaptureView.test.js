import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CaptureView from '../CaptureView.vue'

describe('CaptureView', () => {
  it('renders the placeholder content', () => {
    const wrapper = mount(CaptureView)
    expect(wrapper.text()).toContain('Capture')
    expect(wrapper.text()).toContain('Capture view placeholder')
  })
})
