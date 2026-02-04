import { AppConfig } from "./Config";
import { Transcript } from "./Transcript";
import type { Transcriber, TranscriberFactory } from "./Transcriber";
import { createClient, LiveTranscriptionEvents } from "./deepgram-wrapper";
import type { LiveClient } from "./deepgram-wrapper";

/**
 * DeepgramTranscriber handles real-time speech-to-text transcription using Deepgram's API.
 * It connects to Deepgram's live transcription service and populates a Transcript object
 * with interim and final results.
 */
export class DeepgramTranscriber implements Transcriber {
  private config: AppConfig;
  private transcript: Transcript | null = null;
  private connection: LiveClient | null = null;

  constructor(config: AppConfig) {
    this.config = config;
  }

  /**
   * Creates a factory function that produces DeepgramTranscriber instances
   * configured with the provided AppConfig.
   */
  static createFactory(config: AppConfig): TranscriberFactory {
    return (transcript: Transcript) => {
      const transcriber = new DeepgramTranscriber(config);
      transcriber.attach(transcript);
      return transcriber;
    };
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
      model: 'nova-3',
      language: 'en',
      smart_format: true,
      interim_results: true,
      utterance_end_ms: 1000,
      diarize: true,
      // Opt-out of model improvement program for privacy
      mip_opt_out: true
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

      const words = result.words || [];

      if (data.is_final) {
        if (words.length > 0) {
          let currentSpeaker: string | undefined;
          let currentText = "";

          for (const word of words) {
            const speaker = typeof word.speaker === 'number' ? `Speaker ${word.speaker}` : undefined;
            const w = word.punctuated_word || word.word;

            if (speaker !== currentSpeaker) {
              if (currentSpeaker !== undefined && currentText) {
                transcript.appendStable(currentText, 'transcribed', currentSpeaker);
              }
              currentSpeaker = speaker;
              currentText = w + " ";
            } else {
              currentText += w + " ";
            }
          }

          if (currentSpeaker !== undefined && currentText) {
            transcript.appendStable(currentText, 'transcribed', currentSpeaker);
          }
        } else {
          const text = result.transcript;
          if (text) {
            transcript.appendStable(text + ' ', 'transcribed');
          }
        }
      } else {
        // Interim result - update interim text
        const text = result.transcript;
        if (!text) return;

        let speaker: string | undefined;
        if (words.length > 0 && typeof words[0].speaker === 'number') {
          speaker = `Speaker ${words[0].speaker}`;
        }

        transcript.updateInterim(text, 'transcribed', speaker);
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
      // Connection closed
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
