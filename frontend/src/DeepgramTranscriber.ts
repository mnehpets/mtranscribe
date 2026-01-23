import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import type { LiveClient } from "@deepgram/sdk";
import { AppConfig } from "./Config";
import { Transcript } from "./Transcript";

/**
 * DeepgramTranscriber handles real-time speech-to-text transcription using Deepgram's API.
 * It connects to Deepgram's live transcription service and populates a Transcript object
 * with interim and final results.
 */
export class DeepgramTranscriber {
  private config: AppConfig;
  private transcript: Transcript | null = null;
  private connection: LiveClient | null = null;

  constructor(config: AppConfig) {
    this.config = config;
  }

  /**
   * Attaches a Transcript object to receive transcription updates.
   */
  attach(transcript: Transcript): void {
    this.transcript = transcript;
  }

  /**
   * Starts the transcription connection to Deepgram.
   * Throws an error if the API key is not configured.
   */
  async start(): Promise<void> {
    if (!this.config.deepgramApiKey) {
      throw new Error('Deepgram API key is not configured');
    }

    if (!this.transcript) {
      throw new Error('No transcript attached. Call attach() first.');
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
      // Opt-out of model improvement program for privacy
      tier: 'nova'
    });

    // Set up event handlers
    this.setupEventHandlers();

    // Wait for the connection to open
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      this.connection?.on(LiveTranscriptionEvents.Open, () => {
        clearTimeout(timeout);
        resolve();
      });

      this.connection?.on(LiveTranscriptionEvents.Error, (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Sets up event handlers for the Deepgram connection.
   */
  private setupEventHandlers(): void {
    if (!this.connection || !this.transcript) {
      return;
    }

    const transcript = this.transcript;

    // Handle transcription results
    this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const result = data.channel?.alternatives?.[0];
      if (!result) return;

      const text = result.transcript;
      if (!text) return;

      if (data.is_final) {
        // Final result - append to stable text
        transcript.appendStable(text + ' ', 'transcribed');
      } else {
        // Interim result - update interim text
        transcript.updateInterim(text, 'transcribed');
      }
    });

    // Handle utterance end - finalize the current turn
    this.connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      transcript.finalizeTurn('transcribed');
    });

    // Handle errors
    this.connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error('Deepgram error:', error);
    });

    // Handle connection close
    this.connection.on(LiveTranscriptionEvents.Close, () => {
      console.log('Deepgram connection closed');
    });
  }

  /**
   * Sends audio data to the Deepgram service for transcription.
   */
  sendAudio(data: Blob): void {
    if (!this.connection) {
      console.warn('Connection not established. Call start() first.');
      return;
    }

    // Convert Blob to ArrayBuffer and send to Deepgram
    data.arrayBuffer().then((buffer) => {
      this.connection?.send(buffer);
    });
  }

  /**
   * Stops the transcription connection.
   */
  stop(): void {
    if (this.connection) {
      this.connection.requestClose();
      this.connection = null;
    }
  }
}
