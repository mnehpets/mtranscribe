import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import type { LiveClient, LiveTranscriptionEvent } from '@deepgram/sdk';
import { Transcript } from '../Transcript';
import { AppConfig } from '../Config';
import { Transcriber } from './Transcriber';

/**
 * Deepgram-based real-time transcriber implementation.
 */
export class DeepgramTranscriber implements Transcriber {
  private config: AppConfig;
  private transcript: Transcript | null = null;
  private connection: LiveClient | null = null;

  constructor(config: AppConfig) {
    this.config = config;
  }

  /**
   * Attaches a transcript object to receive updates.
   */
  attach(transcript: Transcript): void {
    this.transcript = transcript;
  }

  /**
   * Starts the Deepgram connection and sets up event handlers.
   */
  async start(): Promise<void> {
    if (!this.config.deepgramApiKey) {
      throw new Error('Deepgram API key is not configured');
    }

    if (!this.transcript) {
      throw new Error('Transcript must be attached before starting');
    }

    // Create Deepgram client
    const deepgram = createClient(this.config.deepgramApiKey);

    // Establish live transcription connection
    this.connection = deepgram.listen.live({
      model: 'nova-2',
      language: 'en',
      smart_format: true,
      interim_results: true,
      utterance_end_ms: 1000,
      // Opt-out of model improvement by using nova tier
      tier: 'nova'
    });

    // Set up event handlers
    this.connection.on(LiveTranscriptionEvents.Open, () => {
      console.log('Deepgram connection opened');
    });

    this.connection.on(LiveTranscriptionEvents.Transcript, (data: LiveTranscriptionEvent) => {
      this.handleTranscriptEvent(data);
    });

    this.connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      console.log('Utterance end detected');
      if (this.transcript) {
        this.transcript.finalizeTurn('transcribed');
      }
    });

    this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
      console.error('Deepgram error:', error);
    });

    this.connection.on(LiveTranscriptionEvents.Close, () => {
      console.log('Deepgram connection closed');
    });
  }

  /**
   * Handles transcript events from Deepgram.
   */
  private handleTranscriptEvent(data: LiveTranscriptionEvent): void {
    if (!this.transcript) {
      return;
    }

    const alternative = data.channel?.alternatives?.[0];
    if (!alternative) {
      return;
    }

    const text = alternative.transcript;
    if (!text) {
      return;
    }

    // Check if this is a final result
    if (data.is_final) {
      this.transcript.appendStable(text + ' ', 'transcribed');
    } else {
      // Interim result - replace the interim text
      this.transcript.updateInterim(text, 'transcribed');
    }
  }

  /**
   * Feeds audio data to the Deepgram connection.
   */
  sendAudio(data: Blob): void {
    if (!this.connection) {
      console.warn('Cannot send audio: connection not established');
      return;
    }

    // Convert Blob to ArrayBuffer and send to Deepgram
    data.arrayBuffer().then((buffer) => {
      if (this.connection) {
        this.connection.send(buffer);
      }
    });
  }

  /**
   * Stops the Deepgram connection.
   */
  stop(): void {
    if (this.connection) {
      this.connection.finish();
      this.connection = null;
    }
  }
}
