import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TranscriptView from '../TranscriptView.vue'
import { Transcript } from '../../Transcript'

describe('TranscriptView', () => {
  it('renders a list of turns', () => {
    const transcript = new Transcript(
      'Test Meeting',
      '',
      '',
      [
        { speaker: 'Alice', text: 'Hello world', timestamp: new Date(), interim: '' },
        { speaker: 'Bob', text: 'Hi there', timestamp: new Date(), interim: '' }
      ]
    )

    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })

    const turns = wrapper.findAll('.turn')
    expect(turns).toHaveLength(2)
    expect(turns[0].text()).toContain('Alice')
    expect(turns[0].text()).toContain('Hello world')
    expect(turns[1].text()).toContain('Bob')
    expect(turns[1].text()).toContain('Hi there')
  })

  it('displays speaker name in bold with color', () => {
    const transcript = new Transcript(
      '',
      '',
      '',
      [
        { speaker: 'Alice', text: 'Test message', timestamp: new Date(), interim: '' }
      ]
    )

    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })

    const speakerSpan = wrapper.find('.turn span')
    expect(speakerSpan.classes()).toContain('font-bold')
    // Check that it has one of the color classes
    const hasColorClass = speakerSpan.classes().some(cls => 
      cls.startsWith('text-') && cls.endsWith('-600')
    )
    expect(hasColorClass).toBe(true)
  })

  it('displays speaker name followed by colon', () => {
    const transcript = new Transcript(
      '',
      '',
      '',
      [
        { speaker: 'Alice', text: 'Test message', timestamp: new Date(), interim: '' }
      ]
    )

    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })

    const turn = wrapper.find('.turn')
    expect(turn.text()).toContain('Alice:')
  })

  it('assigns consistent colors to same speaker', () => {
    const transcript = new Transcript(
      '',
      '',
      '',
      [
        { speaker: 'Alice', text: 'First message', timestamp: new Date(), interim: '' },
        { speaker: 'Bob', text: 'Second message', timestamp: new Date(), interim: '' },
        { speaker: 'Alice', text: 'Third message', timestamp: new Date(), interim: '' }
      ]
    )

    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })

    const turns = wrapper.findAll('.turn span')
    const aliceColor1 = turns[0].classes().find(cls => cls.startsWith('text-'))
    const aliceColor2 = turns[2].classes().find(cls => cls.startsWith('text-'))
    
    expect(aliceColor1).toBe(aliceColor2)
  })

  it('displays title when present', () => {
    const transcript = new Transcript(
      'Team Meeting',
      '',
      '',
      []
    )

    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })

    const title = wrapper.find('h1')
    expect(title.exists()).toBe(true)
    expect(title.text()).toBe('Team Meeting')
    expect(title.classes()).toContain('text-2xl')
    expect(title.classes()).toContain('font-bold')
  })

  it('does not display title when empty', () => {
    const transcript = new Transcript(
      '',
      '',
      '',
      []
    )

    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })

    const title = wrapper.find('h1')
    expect(title.exists()).toBe(false)
  })

  it('displays notes in collapsible section when present', () => {
    const transcript = new Transcript(
      '',
      '',
      'Action items: Follow up on project',
      []
    )

    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })

    const details = wrapper.find('details')
    expect(details.exists()).toBe(true)
    
    const summary = details.find('summary')
    expect(summary.text()).toBe('Notes')
    
    expect(details.text()).toContain('Action items: Follow up on project')
  })

  it('does not display notes section when empty', () => {
    const transcript = new Transcript(
      '',
      '',
      '',
      []
    )

    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })

    const details = wrapper.find('details')
    expect(details.exists()).toBe(false)
  })

  it('renders turns on separate lines', () => {
    const transcript = new Transcript(
      '',
      '',
      '',
      [
        { speaker: 'Alice', text: 'First', timestamp: new Date(), interim: '' },
        { speaker: 'Bob', text: 'Second', timestamp: new Date(), interim: '' }
      ]
    )

    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })

    const turns = wrapper.findAll('.turn')
    // Each turn should be a block element (div)
    expect(turns[0].element.tagName).toBe('DIV')
    expect(turns[1].element.tagName).toBe('DIV')
  })

  it('handles empty transcript turns array', () => {
    const transcript = new Transcript('Test', '', '', [])

    const wrapper = mount(TranscriptView, {
      props: { transcript }
    })

    const turns = wrapper.findAll('.turn')
    expect(turns).toHaveLength(0)
  })
})
