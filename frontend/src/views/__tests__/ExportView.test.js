import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ExportView from '../ExportView.vue'
import { Transcript } from '../../Transcript'
import { ref } from 'vue'

// Mock useRecordingSession
vi.mock('../../composables/useRecordingSession', () => ({
  useRecordingSession: () => ({
    transcript: ref(new Transcript('Test Title', 'Summary', 'Notes', [
      { speaker: 'Alice', text: 'Hello', timestamp: new Date(), interim: '' }
    ]))
  })
}))

// Mock MarkdownRenderer
vi.mock('../../MarkdownRenderer', () => ({
  MarkdownRenderer: class {
    render() {
      return '# Test Title\n## Summary\nSummary\n## Notes\nNotes\n## Transcript\n**Alice**: Hello'
    }
  }
}))

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url')
global.URL.revokeObjectURL = vi.fn()

const stubs = {
  TranscriptView: { template: '<div class="transcript-view-stub">Transcript View</div>', props: ['transcript'] },
  // Simple stubs for Fwb components to allow testing logic without full library rendering
  FwbTabs: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: `
      <div>
        <div class="tab-controls">
          <button @click="$emit('update:modelValue', 'preview')">Preview</button>
          <button @click="$emit('update:modelValue', 'markdown')">Markdown Source</button>
        </div>
        <div class="tab-content">
          <slot />
        </div>
      </div>
    `
  },
  FwbTab: {
    props: ['name'],
    template: `
      <div v-show="$parent.modelValue === name">
        <slot />
      </div>
    `
  }
}

describe('ExportView', () => {
  it('renders rendered preview by default', () => {
    const wrapper = mount(ExportView, { global: { stubs } })
    expect(wrapper.find('.transcript-view-stub').exists()).toBe(true)
    // Markdown tab content should be hidden or not present depending on implementation, 
    // but with v-show in stub it is present but hidden.
    // However, textarea might be rendered but hidden.
    // Let's check visibility or just existence if v-if was used (it's not v-if in my stub).
    // In real FwbTabs, inactive tabs are usually hidden (v-show) or not rendered.
    // Let's assume visibility check is safer.
    const textarea = wrapper.find('textarea')
    expect(textarea.isVisible()).toBe(false)
  })

  it('switches to markdown source view', async () => {
    const wrapper = mount(ExportView, { global: { stubs } })
    
    // Click "Markdown Source" button in our stubbed tabs
    const buttons = wrapper.findAll('.tab-controls button')
    const sourceButton = buttons.find(b => b.text().includes('Markdown Source'))
    
    await sourceButton.trigger('click')
    
    const textarea = wrapper.find('textarea')
    expect(textarea.isVisible()).toBe(true)
  })

  it('switches back to preview', async () => {
    const wrapper = mount(ExportView, { global: { stubs } })
    
    // Switch to Markdown
    const buttons = wrapper.findAll('.tab-controls button')
    const sourceButton = buttons.find(b => b.text().includes('Markdown Source'))
    await sourceButton.trigger('click')
    
    // Switch back to Preview
    const previewButton = buttons.find(b => b.text().includes('Preview'))
    await previewButton.trigger('click')
    
    expect(wrapper.find('.transcript-view-stub').isVisible()).toBe(true)
    expect(wrapper.find('textarea').isVisible()).toBe(false)
  })

  it('downloads markdown file on button click', async () => {
    const wrapper = mount(ExportView, { global: { stubs } })
    // Button is "Download Markdown"
    const buttons = wrapper.findAll('button')
    const downloadButton = buttons.find(b => b.text().includes('Download Markdown'))
    
    // Mock document.createElement to verify anchor tag creation and click
    const clickSpy = vi.fn()
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return {
          click: clickSpy,
          setAttribute: vi.fn(),
          style: {},
          href: '',
          download: ''
        }
      }
      return document.createElement(tagName)
    })
    
    // Mock appendChild and removeChild
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})

    await downloadButton.trigger('click')

    expect(createElementSpy).toHaveBeenCalledWith('a')
    expect(appendSpy).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalled()
    expect(global.URL.revokeObjectURL).toHaveBeenCalled()
  })
})
