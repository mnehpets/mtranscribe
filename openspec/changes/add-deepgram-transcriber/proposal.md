# Add Deepgram Transcriber

This change introduces a Deepgram-based real-time transcriber that runs entirely in the frontend. It also establishes a global configuration pattern to manage sensitive credentials like the Deepgram API key.

## Background
The application requires a way to convert speech to text in real-time. Deepgram offers a low-latency WebSocket API for this purpose. Since the goal is a frontend-only implementation for this phase, we need to manage the connection and authentication directly in the browser.

## Goals
- Enable real-time transcription using Deepgram.
- Provide a global mechanism to configure the Deepgram API key.
- Ensure the transcriber can be initialized and used within the Vue application.

## Non-Goals
- Backend proxying of Deepgram requests (this is a direct frontend integration).
- Persistence of the API key beyond the current session (unless simple local storage is implied by "global config", but we'll stick to in-memory/code config for now unless specified otherwise).

## Plan
1.  Define a Global Config class to hold the API key.
2.  Implement a Deepgram Transcriber client using the `@deepgram/sdk` that uses the API key to connect.
3.  Configure the client to use `interim_results`, `utterance_end`, and privacy opt-outs.
4.  Integrate the transcriber into the application flow.
