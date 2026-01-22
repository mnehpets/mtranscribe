# Tasks: Implement Audio Capture Controller

- [x] Define `Transcriber` interface and `TranscriberFactory` type <!-- id: 1 -->
- [x] Create `AudioCaptureController` class scaffolding with factory dependency <!-- id: 2 -->
- [x] Implement `start()` method with `getUserMedia` logic <!-- id: 3 -->
- [x] Implement `stop()` method with transcriber cleanup <!-- id: 4 -->
- [x] Implement `mute()` and `unmute()` methods <!-- id: 10 -->
- [x] Implement `setTranscript()` with transcriber replacement logic <!-- id: 11 -->
- [x] Connect audio stream to `Transcriber.sendAudio()` <!-- id: 5 -->
- [x] Expose `MediaStream` and state for UI consumption <!-- id: 6 -->
- [x] Create a composable (e.g., `useAudioCapture`) for Vue integration <!-- id: 7 -->
- [x] Integrate with `VuMeter` in the UI <!-- id: 8 -->
- [x] Add unit tests for `AudioCaptureController` <!-- id: 9 -->
