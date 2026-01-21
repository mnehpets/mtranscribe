# Tasks

- [ ] Install `@deepgram/sdk` dependency. <!-- id: 0 -->
- [ ] Create `frontend/src/Config.ts` with `AppConfig` singleton class. <!-- id: 1 -->
- [ ] Update `frontend/src/Transcript.ts` to support multiple active turns keyed by source. <!-- id: 10 -->
- [ ] Create `frontend/src/transcriber/Transcriber.ts` interface (optional but good practice) and `frontend/src/transcriber/DeepgramTranscriber.ts`. <!-- id: 2 -->
- [ ] Implement `attach(transcript: Transcript)` method in `DeepgramTranscriber`. <!-- id: 11 -->
- [ ] Implement `connect` method in `DeepgramTranscriber` using `@deepgram/sdk` with `interim_results: true` and `utterance_end_ms`. <!-- id: 3 -->
- [ ] Configure `DeepgramTranscriber` to opt-out of model improvement. <!-- id: 4 -->
- [ ] Implement `sendAudio` method in `DeepgramTranscriber` to stream data to the SDK. <!-- id: 5 -->
- [ ] Implement event handling: call `updateInterim` for `is_final=false`, call `appendStable` for `is_final=true`. <!-- id: 6 -->
- [ ] Implement event handling for `utterance_end` to call `transcript.finalizeTurn`. <!-- id: 7 -->
- [ ] Add unit tests for `AppConfig`. <!-- id: 8 -->
- [ ] Add unit tests for `DeepgramTranscriber` (mocking SDK and verifying calls to Transcript). <!-- id: 9 -->
- [ ] Add unit tests for `Transcript` new methods. <!-- id: 12 -->
