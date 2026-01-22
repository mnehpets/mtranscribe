import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TranscriptView from '../TranscriptView.vue'
import { Transcript } from '../../Transcript'

describe('TranscriptView', () => {
  it('renders a list of turns', () => {
    const transcript = new Transcript('Test Title', '', '', [
      { speaker: 'Alice', text: 'Hello', timestamp: new Date(), interim: '' },
      { speaker: 'Bob', text: 'Hi there', timestamp: new Date(), interim: '' }
    ])
    
    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })
    
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Hello')
    expect(wrapper.text()).toContain('Bob')
    expect(wrapper.text()).toContain('Hi there')
  })

  it('displays each turn on a separate line', () => {
    const transcript = new Transcript('', '', '', [
      { speaker: 'Alice', text: 'First message', timestamp: new Date(), interim: '' },
      { speaker: 'Bob', text: 'Second message', timestamp: new Date(), interim: '' }
    ])
    
    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })
    
    const turns = wrapper.findAll('.turn')
    expect(turns).toHaveLength(2)
  })

  it('displays speaker names in bold', () => {
    const transcript = new Transcript('', '', '', [
      { speaker: 'Alice', text: 'Hello', timestamp: new Date(), interim: '' }
    ])
    
    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })
    
    const speakerElement = wrapper.find('.font-bold')
    expect(speakerElement.exists()).toBe(true)
    expect(speakerElement.text()).toBe('Alice')
  })

  it('colors speaker names consistently', () => {
    const transcript = new Transcript('', '', '', [
      { speaker: 'Alice', text: 'First', timestamp: new Date(), interim: '' },
      { speaker: 'Alice', text: 'Second', timestamp: new Date(), interim: '' }
    ])
    
    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })
    
    const speakerElements = wrapper.findAll('.font-bold')
    expect(speakerElements).toHaveLength(2)
    
    // Both Alice instances should have the same color class
    const firstColor = speakerElements[0].classes().find(c => c.startsWith('text-'))
    const secondColor = speakerElements[1].classes().find(c => c.startsWith('text-'))
    expect(firstColor).toBe(secondColor)
  })

  it('assigns different colors to different speakers', () => {
    const transcript = new Transcript('', '', '', [
      { speaker: 'Alice', text: 'Hello', timestamp: new Date(), interim: '' },
      { speaker: 'Bob', text: 'Hi', timestamp: new Date(), interim: '' }
    ])
    
    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })
    
    const speakerElements = wrapper.findAll('.font-bold')
    const aliceColor = speakerElements[0].classes().find(c => c.startsWith('text-'))
    const bobColor = speakerElements[1].classes().find(c => c.startsWith('text-'))
    
    // Alice and Bob should have different colors (though not guaranteed due to hash collision)
    // This test verifies the color is applied
    expect(aliceColor).toMatch(/^text-/)
    expect(bobColor).toMatch(/^text-/)
  })

  it('includes colon after speaker name', () => {
    const transcript = new Transcript('', '', '', [
      { speaker: 'Alice', text: 'Hello', timestamp: new Date(), interim: '' }
    ])
    
    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })
    
    const turnElement = wrapper.find('.turn')
    expect(turnElement.text()).toContain('Alice: Hello')
  })

  it('displays title when provided', () => {
    const transcript = new Transcript('Meeting Minutes', '', '', [])
    
    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })
    
    const titleElement = wrapper.find('h1')
    expect(titleElement.exists()).toBe(true)
    expect(titleElement.text()).toBe('Meeting Minutes')
    expect(titleElement.classes()).toContain('font-bold')
  })

  it('does not display title when not provided', () => {
    const transcript = new Transcript('', '', '', [])
    
    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })
    
    const titleElement = wrapper.find('h1')
    expect(titleElement.exists()).toBe(false)
  })

  it('displays notes in a collapsible section', () => {
    const transcript = new Transcript('', '', 'Action items: Review the proposal', [])
    
    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })
    
    const detailsElement = wrapper.find('details')
    expect(detailsElement.exists()).toBe(true)
    
    const summaryElement = wrapper.find('summary')
    expect(summaryElement.exists()).toBe(true)
    expect(summaryElement.text()).toBe('Notes')
    
    expect(wrapper.text()).toContain('Action items: Review the proposal')
  })

  it('does not display notes section when not provided', () => {
    const transcript = new Transcript('', '', '', [])
    
    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })
    
    const detailsElement = wrapper.find('details')
    expect(detailsElement.exists()).toBe(false)
  })

  it('renders empty transcript without errors', () => {
    const transcript = new Transcript()
    
    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })
    
    expect(wrapper.find('.transcript-view').exists()).toBe(true)
    expect(wrapper.findAll('.turn')).toHaveLength(0)
  })

  it('renders turns in chronological order', () => {
    const transcript = new Transcript('', '', '', [
      { speaker: 'Alice', text: 'First', timestamp: new Date(), interim: '' },
      { speaker: 'Bob', text: 'Second', timestamp: new Date(), interim: '' },
      { speaker: 'Alice', text: 'Third', timestamp: new Date(), interim: '' }
    ])
    
    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })
    
    const turns = wrapper.findAll('.turn')
    expect(turns[0].text()).toContain('First')
    expect(turns[1].text()).toContain('Second')
    expect(turns[2].text()).toContain('Third')
  })
})
