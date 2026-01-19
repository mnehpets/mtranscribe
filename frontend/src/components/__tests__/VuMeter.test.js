import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import VuMeter from '../VuMeter.vue'

describe('VuMeter', () => {
  let mockAudioContext
  let mockAnalyserNode
  let mockMediaStreamSource
  let mockGetByteFrequencyData

  beforeEach(() => {
    // Mock MediaStream
    global.MediaStream = class MediaStream {
      constructor() {
        this.id = 'mock-stream'
      }
    }

    // Mock Web Audio API
    mockGetByteFrequencyData = vi.fn((array) => {
      // Simulate some audio data
      for (let i = 0; i < array.length; i++) {
        array[i] = 100 // Mid-level audio
      }
    })

    mockAnalyserNode = {
      fftSize: 256,
      smoothingTimeConstant: 0.8,
      frequencyBinCount: 128,
      getByteFrequencyData: mockGetByteFrequencyData,
      disconnect: vi.fn()
    }

    mockMediaStreamSource = {
      connect: vi.fn(),
      disconnect: vi.fn()
    }

    mockAudioContext = {
      createAnalyser: vi.fn(() => mockAnalyserNode),
      createMediaStreamSource: vi.fn(() => mockMediaStreamSource),
      close: vi.fn(),
      state: 'running'
    }

    global.AudioContext = vi.fn(() => mockAudioContext)
    global.webkitAudioContext = vi.fn(() => mockAudioContext)
    
    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => {
      setTimeout(cb, 0)
      return 1
    })
    global.cancelAnimationFrame = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders a visual bar', () => {
    const wrapper = mount(VuMeter)
    expect(wrapper.find('.bg-gray-200').exists()).toBe(true)
    expect(wrapper.find('.bg-green-500').exists()).toBe(true)
  })

  it('accepts mediaStream and enabled props', () => {
    const mockStream = new MediaStream()
    const wrapper = mount(VuMeter, {
      props: {
        mediaStream: mockStream,
        enabled: true
      }
    })
    expect(wrapper.props('mediaStream')).toStrictEqual(mockStream)
    expect(wrapper.props('enabled')).toBe(true)
  })

  it('initializes with zero volume', () => {
    const wrapper = mount(VuMeter)
    const bar = wrapper.find('.bg-green-500')
    expect(bar.attributes('style')).toContain('width: 0%')
  })

  it('creates AudioContext when enabled with mediaStream', async () => {
    const mockStream = new MediaStream()
    const wrapper = mount(VuMeter, {
      props: {
        mediaStream: mockStream,
        enabled: true
      }
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    expect(global.AudioContext).toHaveBeenCalled()
    expect(mockAudioContext.createAnalyser).toHaveBeenCalled()
    expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(mockStream)
  })

  it('does not create AudioContext when disabled', async () => {
    const mockStream = new MediaStream()
    const wrapper = mount(VuMeter, {
      props: {
        mediaStream: mockStream,
        enabled: false
      }
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    expect(global.AudioContext).not.toHaveBeenCalled()
  })

  it('does not create AudioContext when no mediaStream', async () => {
    const wrapper = mount(VuMeter, {
      props: {
        mediaStream: null,
        enabled: true
      }
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    expect(global.AudioContext).not.toHaveBeenCalled()
  })

  it('cleans up audio resources when disabled', async () => {
    const mockStream = new MediaStream()
    const wrapper = mount(VuMeter, {
      props: {
        mediaStream: mockStream,
        enabled: true
      }
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Verify AudioContext was created
    expect(global.AudioContext).toHaveBeenCalled()
    
    // Disable the component
    await wrapper.setProps({ enabled: false })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Verify cleanup
    expect(mockMediaStreamSource.disconnect).toHaveBeenCalled()
    expect(mockAnalyserNode.disconnect).toHaveBeenCalled()
    expect(mockAudioContext.close).toHaveBeenCalled()
    expect(global.cancelAnimationFrame).toHaveBeenCalled()
  })

  it('cleans up audio resources on unmount', async () => {
    const mockStream = new MediaStream()
    const wrapper = mount(VuMeter, {
      props: {
        mediaStream: mockStream,
        enabled: true
      }
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Verify AudioContext was created
    expect(global.AudioContext).toHaveBeenCalled()
    
    // Unmount the component
    wrapper.unmount()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Verify cleanup
    expect(mockMediaStreamSource.disconnect).toHaveBeenCalled()
    expect(mockAnalyserNode.disconnect).toHaveBeenCalled()
    expect(mockAudioContext.close).toHaveBeenCalled()
  })

  it('calculates volume using logarithmic scale', async () => {
    // Mock getByteFrequencyData to return specific values
    mockGetByteFrequencyData.mockImplementation((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = 200 // Higher audio level
      }
    })

    const mockStream = new MediaStream()
    const wrapper = mount(VuMeter, {
      props: {
        mediaStream: mockStream,
        enabled: true
      }
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // The component should calculate volume and update the bar
    const bar = wrapper.find('.bg-green-500')
    const style = bar.attributes('style')
    
    // Check that volume is greater than 0
    expect(style).toMatch(/width: \d+/)
    // Extract the width value
    const widthMatch = style.match(/width: ([\d.]+)%/)
    if (widthMatch) {
      const width = parseFloat(widthMatch[1])
      expect(width).toBeGreaterThan(0)
    }
  })

  it('returns to zero when disabled', async () => {
    const mockStream = new MediaStream()
    const wrapper = mount(VuMeter, {
      props: {
        mediaStream: mockStream,
        enabled: true
      }
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Disable the component
    await wrapper.setProps({ enabled: false })
    await wrapper.vm.$nextTick()
    
    // Volume should be reset to 0
    const bar = wrapper.find('.bg-green-500')
    expect(bar.attributes('style')).toContain('width: 0%')
  })
})
