import { Transcript } from '../Transcript';

/**
 * Interface for transcriber implementations.
 */
export interface Transcriber {
  /**
   * Attaches a transcript object to receive updates.
   */
  attach(transcript: Transcript): void;

  /**
   * Starts the transcription connection and audio processing.
   */
  start(): Promise<void>;

  /**
   * Stops the transcription connection.
   */
  stop(): void;

  /**
   * Feeds audio data to the transcriber.
   */
  sendAudio(data: Blob): void;
}
