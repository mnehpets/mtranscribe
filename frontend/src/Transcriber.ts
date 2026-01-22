export interface Transcriber {
  sendAudio(data: Blob): void;
  stop(): void;
}

export type TranscriberFactory = (transcript: import('./Transcript').Transcript) => Transcriber;
