# Add Deepgram Transcriber

This change introduces a Deepgram-based real-time transcriber that runs entirely in the frontend. It also establishes a global configuration pattern to manage sensitive credentials like the Deepgram API key.

## Why
The application requires a way to convert speech to text in real-time. Deepgram offers a low-latency WebSocket API for this purpose. Since the goal is a frontend-only implementation for this phase, we need to manage the connection and authentication directly in the browser.

## Goals
- Enable real-time transcription using Deepgram.
- Provide a global mechanism to configure the Deepgram API key.
- Ensure the transcriber can be initialized and used within the Vue application.

## What Changes
We will implement:
- A Global Config class to hold the API key.
- A Deepgram Transcriber client using the `@deepgram/sdk`.
- Integration of the transcriber into the application flow.

## Non-Goals
- Backend proxying of Deepgram requests (this is a direct frontend integration).
- Persistence of the API key beyond the current session (unless simple local storage is implied by "global config", but we'll stick to in-memory/code config for now unless specified otherwise).
