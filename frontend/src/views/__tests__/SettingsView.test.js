import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsView from '../SettingsView.vue'

describe('SettingsView', () => {
  it('renders the placeholder content', () => {
    const wrapper = mount(SettingsView)
    expect(wrapper.text()).toContain('Settings')
    expect(wrapper.text()).toContain('Settings view placeholder')
  })
})
