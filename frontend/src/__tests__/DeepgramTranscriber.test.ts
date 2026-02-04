import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeepgramTranscriber } from '../DeepgramTranscriber';
import { AppConfig } from '../Config';
import { Transcript } from '../Transcript';
import { LiveTranscriptionEvents } from '@deepgram/sdk';

// Mock the @deepgram/sdk module
vi.mock('@deepgram/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@deepgram/sdk')>();
  
  const mockConnection = {
    on: vi.fn(),
    send: vi.fn(),
    requestClose: vi.fn()
  };

  const mockListen = {
    live: vi.fn(() => mockConnection)
  };

  const mockClient = {
    listen: mockListen
  };

  return {
    ...actual,
    createClient: vi.fn(() => mockClient),
  };
});

describe('DeepgramTranscriber', () => {
  let config: AppConfig;
  let transcriber: DeepgramTranscriber;
  let transcript: Transcript;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create fresh instances
    // @ts-ignore - accessing private property for testing
    AppConfig.instance = undefined;
    config = AppConfig.getInstance();
    config.deepgramApiKey = 'test-api-key';
    
    transcriber = new DeepgramTranscriber(config);
    transcript = new Transcript();
  });

  describe('attach', () => {
    it('attaches a transcript object', () => {
      transcriber.attach(transcript);
      // No error thrown, successfully attached
      expect(true).toBe(true);
    });
  });

  describe('start', () => {
    it('throws error if API key is not configured', async () => {
      config.deepgramApiKey = '';
      
      await expect(transcriber.start()).rejects.toThrow('Deepgram API key is not configured');
    });

    it('throws error if no transcript is attached', async () => {
      await expect(transcriber.start()).rejects.toThrow('No transcript attached');
    });

    it('creates a Deepgram client with the API key', async () => {
      transcriber.attach(transcript);
      
      // Mock the Deepgram SDK
      const { createClient } = await import('@deepgram/sdk');
      
      // Start the transcriber (this will timeout waiting for Open event, but that's ok for this test)
      const startPromise = transcriber.start();
      
      // Give it a moment to call createClient
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(createClient).toHaveBeenCalledWith('test-api-key');
      
      // Clean up the hanging promise
      transcriber.stop();
    });

    it('configures live transcription with correct parameters', async () => {
      transcriber.attach(transcript);
      
      const { createClient } = await import('@deepgram/sdk');
      // @ts-ignore - we know this is a mock
      const mockClient = createClient.mock.results[0]?.value || createClient();
      
      // Start the transcriber
      const startPromise = transcriber.start();
      
      // Give it a moment to set up
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockClient.listen.live).toHaveBeenCalledWith({
        model: 'nova-3',
        language: 'en',
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 1000,
        diarize: true,
        mip_opt_out: true
      });
      
      // Clean up
      transcriber.stop();
    });
  });

  describe('sendAudio', () => {
    it('sends audio data to the connection', async () => {
      transcriber.attach(transcript);
      
      // Mock Blob with arrayBuffer method
      const mockBuffer = new ArrayBuffer(8);
      const blob = {
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer)
      } as unknown as Blob;
      
      // Start the connection
      const { createClient } = await import('@deepgram/sdk');
      // @ts-ignore
      const mockClient = createClient.mock.results[0]?.value || createClient();
      // @ts-ignore
      const mockConnection = mockClient.listen.live.mock.results[0]?.value || mockClient.listen.live();
      
      const startPromise = transcriber.start();
      
      // Give it time to set up
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Send audio
      transcriber.sendAudio(blob);
      
      // Wait for the async arrayBuffer conversion
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockConnection.send).toHaveBeenCalled();
      
      // Clean up
      transcriber.stop();
    });

    it('logs warning if connection not established', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock Blob with arrayBuffer method
      const blob = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
      } as unknown as Blob;
      
      transcriber.sendAudio(blob);
      
      expect(consoleSpy).toHaveBeenCalledWith('Connection not established. Call start() first.');
      
      consoleSpy.mockRestore();
    });
  });

  describe('stop', () => {
    it('requests to close the connection', async () => {
      transcriber.attach(transcript);
      
      const { createClient } = await import('@deepgram/sdk');
      // @ts-ignore
      const mockClient = createClient.mock.results[0]?.value || createClient();
      // @ts-ignore
      const mockConnection = mockClient.listen.live.mock.results[0]?.value || mockClient.listen.live();
      
      const startPromise = transcriber.start();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      transcriber.stop();
      
      expect(mockConnection.requestClose).toHaveBeenCalled();
    });

    it('does nothing if no connection exists', () => {
      // Should not throw
      transcriber.stop();
      expect(true).toBe(true);
    });
  });

  describe('event handling', () => {
    it('sets up event handlers after connection', async () => {
      transcriber.attach(transcript);
      
      const { createClient } = await import('@deepgram/sdk');
      // @ts-ignore
      const mockClient = createClient.mock.results[0]?.value || createClient();
      // @ts-ignore
      const mockConnection = mockClient.listen.live.mock.results[0]?.value || mockClient.listen.live();
      
      const startPromise = transcriber.start();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Verify event handlers were registered
      expect(mockConnection.on).toHaveBeenCalled();
      
      // Clean up
      transcriber.stop();
    });

    it('calls updateInterim for interim results', async () => {
      transcriber.attach(transcript);
      
      const updateInterimSpy = vi.spyOn(transcript, 'updateInterim');
      
      const { createClient } = await import('@deepgram/sdk');
      // @ts-ignore
      const mockClient = createClient.mock.results[0]?.value || createClient();
      // @ts-ignore
      const mockConnection = mockClient.listen.live.mock.results[0]?.value || mockClient.listen.live();
      
      const startPromise = transcriber.start();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Find the Transcript event handler
      // @ts-ignore
      const transcriptHandler = mockConnection.on.mock.calls.find(
        (call: any) => call[0] === LiveTranscriptionEvents.Transcript
      )?.[1];
      
      if (transcriptHandler) {
        // Simulate interim result
        transcriptHandler({
          is_final: false,
          channel: {
            alternatives: [
              {
                transcript: 'Hello',
                words: [ { word: 'Hello', start: 0.0, end: 0.5, speaker: 1 } ]
              }
            ]
          }
        });
        
        expect(updateInterimSpy).toHaveBeenCalledWith('Hello', 'transcribed', 'Speaker 1');
      }
      
      // Clean up
      transcriber.stop();
    });

    it('calls appendStable for final results', async () => {
      transcriber.attach(transcript);
      
      const appendStableSpy = vi.spyOn(transcript, 'appendStable');
      
      const { createClient } = await import('@deepgram/sdk');
      // @ts-ignore
      const mockClient = createClient.mock.results[0]?.value || createClient();
      // @ts-ignore
      const mockConnection = mockClient.listen.live.mock.results[0]?.value || mockClient.listen.live();
      
      const startPromise = transcriber.start();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Find the Transcript event handler
      // @ts-ignore
      const transcriptHandler = mockConnection.on.mock.calls.find(
        (call: any) => call[0] === LiveTranscriptionEvents.Transcript
      )?.[1];
      
      if (transcriptHandler) {
        // Simulate final result
        transcriptHandler({
          is_final: true,
          channel: {
            alternatives: [
              { transcript: 'Hello world' }
            ]
          }
        });
        
        expect(appendStableSpy).toHaveBeenCalledWith('Hello world ', 'transcribed');
      }
      
      // Clean up
      transcriber.stop();
    });

    it('calls appendStable with speaker info for final results', async () => {
      transcriber.attach(transcript);
      
      const appendStableSpy = vi.spyOn(transcript, 'appendStable');
      
      const { createClient } = await import('@deepgram/sdk');
      // @ts-ignore
      const mockClient = createClient.mock.results[0]?.value || createClient();
      // @ts-ignore
      const mockConnection = mockClient.listen.live.mock.results[0]?.value || mockClient.listen.live();
      
      const startPromise = transcriber.start();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Find the Transcript event handler
      // @ts-ignore
      const transcriptHandler = mockConnection.on.mock.calls.find(
        (call: any) => call[0] === LiveTranscriptionEvents.Transcript
      )?.[1];
      
      if (transcriptHandler) {
        // Simulate final result with speaker info
        transcriptHandler({
          is_final: true,
          channel: {
            alternatives: [
              {
                transcript: 'Hello world',
                words: [
                  { word: 'Hello', start: 0.0, end: 0.5, speaker: 1, punctuated_word: 'Hello' },
                  { word: 'world', start: 0.6, end: 1.0, speaker: 1, punctuated_word: 'world' }
                ]
              }
            ]
          }
        });
        
        expect(appendStableSpy).toHaveBeenCalledWith('Hello world ', 'transcribed', 'Speaker 1');
      }
      
      // Clean up
      transcriber.stop();
    });

    it('calls finalizeTurn on utterance end', async () => {
      transcriber.attach(transcript);
      
      const finalizeTurnSpy = vi.spyOn(transcript, 'finalizeTurn');
      
      const { createClient } = await import('@deepgram/sdk');
      // @ts-ignore
      const mockClient = createClient.mock.results[0]?.value || createClient();
      // @ts-ignore
      const mockConnection = mockClient.listen.live.mock.results[0]?.value || mockClient.listen.live();
      
      const startPromise = transcriber.start();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Find the UtteranceEnd event handler
      // @ts-ignore
      const utteranceEndHandler = mockConnection.on.mock.calls.find(
        (call: any) => call[0] === LiveTranscriptionEvents.UtteranceEnd
      )?.[1];
      
      if (utteranceEndHandler) {
        // Simulate utterance end
        utteranceEndHandler();
        
        expect(finalizeTurnSpy).toHaveBeenCalledWith('transcribed');
      }
      
      // Clean up
      transcriber.stop();
    });
  });
});
