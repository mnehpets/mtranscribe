# Tasks: Implement Audio Capture Controller

- [ ] Define `Transcriber` interface and `TranscriberFactory` type <!-- id: 1 -->
- [ ] Create `AudioCaptureController` class scaffolding with factory dependency <!-- id: 2 -->
- [ ] Implement `start()` method with `getUserMedia` logic <!-- id: 3 -->
- [ ] Implement `stop()` method with transcriber cleanup <!-- id: 4 -->
- [ ] Implement `mute()` and `unmute()` methods <!-- id: 10 -->
- [ ] Implement `setTranscript()` with transcriber replacement logic <!-- id: 11 -->
- [ ] Connect audio stream to `Transcriber.sendAudio()` <!-- id: 5 -->
- [ ] Expose `MediaStream` and state for UI consumption <!-- id: 6 -->
- [ ] Create a composable (e.g., `useAudioCapture`) for Vue integration <!-- id: 7 -->
- [ ] Integrate with `VuMeter` in the UI <!-- id: 8 -->
- [ ] Add unit tests for `AudioCaptureController` <!-- id: 9 -->
