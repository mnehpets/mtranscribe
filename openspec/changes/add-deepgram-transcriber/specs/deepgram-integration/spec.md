# Deepgram Integration Specs

## ADDED Requirements

### Requirement: Global Configuration
The application MUST possess a central configuration store for the Deepgram API key.

#### Scenario: Setting the API Key
Given the application is initialized
When the user or system sets the `deepgramApiKey` in the global config
Then the key is available for the transcriber to use

### Requirement: Deepgram Transcriber Connection
The transcriber MUST be able to establish a connection to Deepgram services using the provided API key.

#### Scenario: Successful Connection
Given a valid `deepgramApiKey` is configured
When the transcriber is started
Then it establishes a live transcription session with Deepgram
And it configures the session to use `interim_results`
And it configures the session to use `utterance_end` detection

#### Scenario: Missing API Key
Given the `deepgramApiKey` is empty or undefined
When the transcriber attempts to start
Then it throws a configuration error

### Requirement: Transcript Attachment API
The transcriber MUST provide an API to attach a `Transcript` object for population.

#### Scenario: Attaching Transcript
Given a `DeepgramTranscriber` instance
And a `Transcript` object
When `attach(transcript)` is called
Then the transcriber holds a reference to the transcript for future updates

### Requirement: Privacy Compliance
The transcriber MUST opt-out of data collection features.

#### Scenario: Model Improvement Opt-out
Given the transcriber is initializing a connection
When the connection configuration is built
Then it MUST include the flag to opt-out of the "model improvement program" (e.g. `tier=nova` or explicit query param if applicable, usually `tier` or explicit setting in SDK)

### Requirement: Transcription Updates
The transcriber MUST populate the attached `Transcript` object using interim results and utterance detection.

#### Scenario: Interim Results
Given the transcriber has an attached `Transcript`
When Deepgram sends an interim transcript result
Then the transcriber calls `transcript.updateInterim(text, 'transcribed')`
And the transcript state is updated with the new text

#### Scenario: Utterance End
Given the transcriber has an attached `Transcript`
When Deepgram sends an "utterance end" event
Then the transcriber calls `transcript.finalizeTurn('transcribed')`
And the transcript closes the current turn
