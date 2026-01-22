import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ExportView from '../ExportView.vue'

describe('ExportView', () => {
  it('renders the placeholder content', () => {
    const wrapper = mount(ExportView)
    expect(wrapper.text()).toContain('Export')
    expect(wrapper.text()).toContain('Export view placeholder')
  })
})
