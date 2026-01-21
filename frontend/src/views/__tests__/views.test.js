import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CaptureView from '../CaptureView.vue'
import ExportView from '../ExportView.vue'
import SettingsView from '../SettingsView.vue'

describe('CaptureView', () => {
  it('renders the capture heading', () => {
    const wrapper = mount(CaptureView)
    expect(wrapper.text()).toContain('Capture')
  })
  
  it('displays placeholder message', () => {
    const wrapper = mount(CaptureView)
    expect(wrapper.text()).toContain('Live transcription capture will be implemented here')
  })
})

describe('ExportView', () => {
  it('renders the export heading', () => {
    const wrapper = mount(ExportView)
    expect(wrapper.text()).toContain('Export')
  })
  
  it('displays placeholder message', () => {
    const wrapper = mount(ExportView)
    expect(wrapper.text()).toContain('Export transcriptions will be implemented here')
  })
})

describe('SettingsView', () => {
  it('renders the settings heading', () => {
    const wrapper = mount(SettingsView)
    expect(wrapper.text()).toContain('Settings')
  })
  
  it('displays placeholder message', () => {
    const wrapper = mount(SettingsView)
    expect(wrapper.text()).toContain('Application settings will be implemented here')
  })
})
