import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DeepgramTranscriber } from '../transcriber/DeepgramTranscriber'
import { Transcript } from '../Transcript'
import { AppConfig } from '../Config'

// Mock the Deepgram SDK
vi.mock('@deepgram/sdk', () => {
  const mockLiveClient = {
    on: vi.fn(),
    send: vi.fn(),
    finish: vi.fn()
  }
  
  return {
    createClient: vi.fn(() => ({
      listen: {
        live: vi.fn(() => mockLiveClient)
      }
    })),
    LiveTranscriptionEvents: {
      Open: 'Open',
      Transcript: 'Transcript',
      UtteranceEnd: 'UtteranceEnd',
      Error: 'Error',
      Close: 'Close'
    },
    // Export the mock client so tests can access it
    __mockLiveClient: mockLiveClient
  }
})

describe('DeepgramTranscriber', () => {
  let transcriber: DeepgramTranscriber
  let config: AppConfig
  let transcript: Transcript

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Setup config
    config = AppConfig.getInstance()
    config.deepgramApiKey = 'test-api-key'
    
    // Create instances
    transcriber = new DeepgramTranscriber(config)
    transcript = new Transcript()
  })

  describe('attach', () => {
    it('attaches a transcript object', () => {
      expect(() => transcriber.attach(transcript)).not.toThrow()
    })
  })

  describe('start', () => {
    it('throws error if API key is not configured', async () => {
      const emptyConfig = AppConfig.getInstance()
      emptyConfig.deepgramApiKey = ''
      const emptyTranscriber = new DeepgramTranscriber(emptyConfig)
      emptyTranscriber.attach(transcript)
      
      await expect(emptyTranscriber.start()).rejects.toThrow('Deepgram API key is not configured')
    })

    it('throws error if transcript is not attached', async () => {
      await expect(transcriber.start()).rejects.toThrow('Transcript must be attached before starting')
    })

    it('creates a Deepgram connection with correct configuration', async () => {
      const { createClient } = await import('@deepgram/sdk')
      
      transcriber.attach(transcript)
      await transcriber.start()
      
      expect(createClient).toHaveBeenCalledWith('test-api-key')
    })
  })

  describe('sendAudio', () => {
    it('converts blob to arraybuffer and sends to connection', async () => {
      const { createClient } = await import('@deepgram/sdk')
      const mockClient = (createClient as any)()
      const mockLiveClient = mockClient.listen.live()
      
      transcriber.attach(transcript)
      await transcriber.start()
      
      // Create a mock blob with arrayBuffer method
      const mockArrayBuffer = new ArrayBuffer(8)
      const mockBlob = {
        arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer)
      } as any
      
      transcriber.sendAudio(mockBlob)
      
      // Wait for async arrayBuffer conversion
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(mockBlob.arrayBuffer).toHaveBeenCalled()
      expect(mockLiveClient.send).toHaveBeenCalledWith(mockArrayBuffer)
    })
  })

  describe('stop', () => {
    it('finishes the connection', async () => {
      const { createClient } = await import('@deepgram/sdk')
      const mockClient = (createClient as any)()
      const mockLiveClient = mockClient.listen.live()
      
      transcriber.attach(transcript)
      await transcriber.start()
      transcriber.stop()
      
      expect(mockLiveClient.finish).toHaveBeenCalled()
    })
  })

  describe('transcript event handling', () => {
    it('calls updateInterim for non-final results', async () => {
      transcriber.attach(transcript)
      await transcriber.start()
      
      const { createClient } = await import('@deepgram/sdk')
      const mockClient = (createClient as any)()
      const mockLiveClient = mockClient.listen.live()
      
      // Get the Transcript event handler
      const transcriptHandler = (mockLiveClient.on as any).mock.calls.find(
        (call: any) => call[0] === 'Transcript'
      )?.[1]
      
      expect(transcriptHandler).toBeDefined()
      
      // Simulate an interim result
      transcriptHandler({
        is_final: false,
        channel: {
          alternatives: [{
            transcript: 'hello world'
          }]
        }
      })
      
      expect(transcript.turns.length).toBe(1)
      expect(transcript.turns[0].interim).toBe('hello world')
    })

    it('calls appendStable for final results', async () => {
      transcriber.attach(transcript)
      await transcriber.start()
      
      const { createClient } = await import('@deepgram/sdk')
      const mockClient = (createClient as any)()
      const mockLiveClient = mockClient.listen.live()
      
      // Get the Transcript event handler
      const transcriptHandler = (mockLiveClient.on as any).mock.calls.find(
        (call: any) => call[0] === 'Transcript'
      )?.[1]
      
      // Simulate a final result
      transcriptHandler({
        is_final: true,
        channel: {
          alternatives: [{
            transcript: 'final text'
          }]
        }
      })
      
      expect(transcript.turns.length).toBe(1)
      expect(transcript.turns[0].text).toBe('final text ')
      expect(transcript.turns[0].interim).toBe('')
    })

    it('calls finalizeTurn on utterance end', async () => {
      transcriber.attach(transcript)
      await transcriber.start()
      
      const { createClient } = await import('@deepgram/sdk')
      const mockClient = (createClient as any)()
      const mockLiveClient = mockClient.listen.live()
      
      // Setup a turn first
      transcript.updateInterim('test', 'transcribed')
      
      // Get the UtteranceEnd event handler
      const utteranceEndHandler = (mockLiveClient.on as any).mock.calls.find(
        (call: any) => call[0] === 'UtteranceEnd'
      )?.[1]
      
      expect(utteranceEndHandler).toBeDefined()
      
      // Simulate utterance end
      utteranceEndHandler()
      
      // After finalizeTurn, the active turn should be removed
      // so updating should create a new turn
      transcript.updateInterim('new turn', 'transcribed')
      expect(transcript.turns.length).toBe(2)
    })
  })
})
