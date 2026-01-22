import { Transcript } from './Transcript';

export interface Transcriber {
  sendAudio(data: Blob): void;
  stop(): void;
}

export type TranscriberFactory = (transcript: Transcript) => Transcriber;
