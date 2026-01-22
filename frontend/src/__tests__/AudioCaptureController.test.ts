import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AudioCaptureController } from '../AudioCaptureController'
import type { Transcriber, TranscriberFactory } from '../Transcriber'
import { Transcript } from '../Transcript'

describe('AudioCaptureController', () => {
  let mockTranscriber: Transcriber
  let transcriberFactory: TranscriberFactory
  let transcript: Transcript
  let controller: AudioCaptureController

  beforeEach(() => {
    // Mock Transcriber
    mockTranscriber = {
      sendAudio: vi.fn(),
      stop: vi.fn()
    }

    transcriberFactory = vi.fn(() => mockTranscriber)
    transcript = new Transcript('Test Transcript')

    // Mock getUserMedia
    global.navigator = {
      ...global.navigator,
      mediaDevices: {
        getUserMedia: vi.fn(async () => {
          const mockTrack = {
            stop: vi.fn(),
            kind: 'audio',
            enabled: true
          }
          return {
            getTracks: () => [mockTrack],
            getAudioTracks: () => [mockTrack],
            id: 'mock-stream-id'
          } as any
        })
      }
    } as any

    // Mock MediaRecorder
    global.MediaRecorder = vi.fn(function(this: any, stream: MediaStream, options: any) {
      this.stream = stream
      this.options = options
      this.state = 'inactive'
      this.ondataavailable = null
      this.start = vi.fn((timeslice: number) => {
        this.state = 'recording'
      })
      this.stop = vi.fn(() => {
        this.state = 'inactive'
      })
    }) as any

    global.MediaRecorder.isTypeSupported = vi.fn(() => true)

    controller = new AudioCaptureController(transcriberFactory, transcript)
  })

  describe('initial state', () => {
    it('should start in idle state', () => {
      expect(controller.state).toBe('idle')
    })

    it('should have no stream initially', () => {
      expect(controller.stream).toBeNull()
    })
  })

  describe('start()', () => {
    it('should transition to capturing state', async () => {
      await controller.start()
      expect(controller.state).toBe('capturing')
    })

    it('should request microphone access', async () => {
      await controller.start()
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
    })

    it('should create a transcriber instance', async () => {
      await controller.start()
      expect(transcriberFactory).toHaveBeenCalledWith(transcript)
    })

    it('should expose the media stream', async () => {
      await controller.start()
      expect(controller.stream).not.toBeNull()
      expect(controller.stream?.id).toBe('mock-stream-id')
    })

    it('should create a MediaRecorder', async () => {
      await controller.start()
      expect(global.MediaRecorder).toHaveBeenCalled()
    })

    it('should not start if already capturing', async () => {
      await controller.start()
      const firstStream = controller.stream
      
      await controller.start()
      expect(controller.stream).toBe(firstStream)
    })

    it('should cleanup on error', async () => {
      const error = new Error('Permission denied')
      ;(navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(error)

      await expect(controller.start()).rejects.toThrow('Permission denied')
      expect(controller.state).toBe('idle')
      expect(controller.stream).toBeNull()
    })
  })

  describe('stop()', () => {
    it('should transition to idle state', async () => {
      await controller.start()
      controller.stop()
      expect(controller.state).toBe('idle')
    })

    it('should stop all media tracks', async () => {
      await controller.start()
      const stream = controller.stream!
      const tracks = stream.getTracks()
      
      controller.stop()
      
      tracks.forEach(track => {
        expect(track.stop).toHaveBeenCalled()
      })
    })

    it('should stop the transcriber', async () => {
      await controller.start()
      controller.stop()
      expect(mockTranscriber.stop).toHaveBeenCalled()
    })

    it('should clear the stream', async () => {
      await controller.start()
      controller.stop()
      expect(controller.stream).toBeNull()
    })

    it('should do nothing if already idle', () => {
      expect(controller.state).toBe('idle')
      controller.stop()
      expect(controller.state).toBe('idle')
    })
  })

  describe('mute()', () => {
    it('should transition to muted state when capturing', async () => {
      await controller.start()
      controller.mute()
      expect(controller.state).toBe('muted')
    })

    it('should not transition if idle', () => {
      controller.mute()
      expect(controller.state).toBe('idle')
    })

    it('should keep stream active', async () => {
      await controller.start()
      const stream = controller.stream
      controller.mute()
      expect(controller.stream).toBe(stream)
    })
  })

  describe('unmute()', () => {
    it('should transition to capturing state when muted', async () => {
      await controller.start()
      controller.mute()
      controller.unmute()
      expect(controller.state).toBe('capturing')
    })

    it('should not transition if not muted', async () => {
      await controller.start()
      expect(controller.state).toBe('capturing')
      controller.unmute()
      expect(controller.state).toBe('capturing')
    })

    it('should not transition from idle', () => {
      controller.unmute()
      expect(controller.state).toBe('idle')
    })
  })

  describe('setTranscript()', () => {
    it('should update transcript reference when idle', () => {
      const newTranscript = new Transcript('New Transcript')
      controller.setTranscript(newTranscript)
      
      // Verify the new transcriber was created with new transcript
      expect(transcriberFactory).toHaveBeenCalledWith(newTranscript)
    })

    it('should stop capture when capturing', async () => {
      await controller.start()
      expect(controller.state).toBe('capturing')
      
      const newTranscript = new Transcript('New Transcript')
      controller.setTranscript(newTranscript)
      
      expect(controller.state).toBe('idle')
    })

    it('should stop previous transcriber', async () => {
      await controller.start()
      const firstTranscriber = mockTranscriber
      
      // Create a new mock transcriber for the second call
      const secondMockTranscriber = {
        sendAudio: vi.fn(),
        stop: vi.fn()
      }
      transcriberFactory = vi.fn(() => secondMockTranscriber)
      controller = new AudioCaptureController(transcriberFactory, transcript)
      await controller.start()
      
      const newTranscript = new Transcript('New Transcript')
      controller.setTranscript(newTranscript)
      
      expect(secondMockTranscriber.stop).toHaveBeenCalled()
    })

    it('should create new transcriber with new transcript', () => {
      const newTranscript = new Transcript('New Transcript')
      controller.setTranscript(newTranscript)
      
      expect(transcriberFactory).toHaveBeenCalledWith(newTranscript)
    })
  })

  describe('audio data routing', () => {
    it('should send audio data when capturing', async () => {
      await controller.start()
      
      // Simulate MediaRecorder data event
      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
      const mediaRecorder = (global.MediaRecorder as any).mock.results[0].value
      
      // Manually trigger ondataavailable
      if (mediaRecorder.ondataavailable) {
        mediaRecorder.ondataavailable({ data: mockBlob })
      }
      
      expect(mockTranscriber.sendAudio).toHaveBeenCalledWith(mockBlob)
    })

    it('should not send audio data when muted', async () => {
      await controller.start()
      controller.mute()
      
      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
      const mediaRecorder = (global.MediaRecorder as any).mock.results[0].value
      
      // Clear previous calls
      vi.clearAllMocks()
      
      if (mediaRecorder.ondataavailable) {
        mediaRecorder.ondataavailable({ data: mockBlob })
      }
      
      expect(mockTranscriber.sendAudio).not.toHaveBeenCalled()
    })

    it('should resume sending audio data when unmuted', async () => {
      await controller.start()
      controller.mute()
      controller.unmute()
      
      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
      const mediaRecorder = (global.MediaRecorder as any).mock.results[0].value
      
      // Clear previous calls
      vi.clearAllMocks()
      
      if (mediaRecorder.ondataavailable) {
        mediaRecorder.ondataavailable({ data: mockBlob })
      }
      
      expect(mockTranscriber.sendAudio).toHaveBeenCalledWith(mockBlob)
    })
  })

  describe('track state management', () => {
    it('should disable audio tracks when muted', async () => {
      await controller.start()
      controller.mute()
      
      const stream = controller.stream
      expect(stream).not.toBeNull()
      const tracks = stream!.getAudioTracks()
      expect(tracks.length).toBeGreaterThan(0)
      expect(tracks[0].enabled).toBe(false)
    })

    it('should enable audio tracks when unmuted', async () => {
      await controller.start()
      controller.mute()
      controller.unmute()
      
      const stream = controller.stream
      expect(stream).not.toBeNull()
      const tracks = stream!.getAudioTracks()
      expect(tracks.length).toBeGreaterThan(0)
      expect(tracks[0].enabled).toBe(true)
    })
  })
})
