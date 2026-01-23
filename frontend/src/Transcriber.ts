import { Transcript } from './Transcript';

export interface Transcriber {
  start?(): Promise<void>;
  sendAudio(data: Blob): void;
  stop(): void;
}

export type TranscriberFactory = (transcript: Transcript) => Transcriber;
