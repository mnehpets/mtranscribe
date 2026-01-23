# Implement Audio Capture Controller

## Summary
Introduce an `AudioCaptureController` to manage microphone access, audio capture state, and the flow of audio data to the transcription service and UI components.

## Problem
Currently, there is no centralized component to handle audio capture, state management (start/stop), and coordination between the microphone, the transcription service, and the UI (VuMeter).

## Solution
Implement a dedicated `AudioCaptureController` class that:
1.  Manages the lifecycle of the `MediaStream` and `AudioContext`.
2.  Provides methods to start and stop capture.
3.  Interfaces with a `Transcriber` (to send audio data) and `Transcript` (context).
4.  Exposes the active `MediaStream` for UI components like `VuMeter`.

## Impact
- **Frontend**: Adds a new service/controller. Existing `VuMeter` will need to be connected to this controller.
- **Architecture**: Decouples capture logic from UI components.
