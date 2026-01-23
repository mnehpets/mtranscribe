# capture-controller Specification

## Purpose
TBD - created by archiving change implement-audio-capture-controller. Update Purpose after archive.
## Requirements
### Requirement: Capture State Management
The controller SHALL manage the state of the audio capture session.

#### Scenario: Start Capture
Given an idle controller
When `start()` is called
Then the state should transition to `capturing`
And the microphone should be accessed

#### Scenario: Stop Capture
Given a capturing controller
When `stop()` is called
Then the state should transition to `idle`
And the microphone tracks should be stopped

### Requirement: Audio Data Routing
The controller SHALL route audio data to the transcription service when capturing.

#### Scenario: Send Audio to Transcriber
Given a capturing controller
When audio samples are received from the microphone
Then the samples should be sent to the `Transcriber` via the `sendAudio(Blob)` method

#### Scenario: No Audio Sent When Muted
Given a muted controller
When audio samples are received from the microphone
Then the samples should NOT be sent to the `Transcriber`

### Requirement: Mute and Unmute
The controller SHALL support muting and unmuting the audio transmission without stopping the stream.

#### Scenario: Mute Capture
Given a capturing controller
When `mute()` is called
Then the state should transition to `muted`
And the media stream should remain active
But audio data transmission to the transcriber should stop

#### Scenario: Unmute Capture
Given a muted controller
When `unmute()` is called
Then the state should transition to `capturing`
And audio data transmission to the transcriber should resume

### Requirement: UI Integration
The controller SHALL expose necessary data for UI components.

#### Scenario: Expose Media Stream
Given a capturing controller
When the media stream is active
Then it should be accessible to consumers (e.g., for VuMeter visualization)

### Requirement: Active Transcript Association
The controller SHALL maintain a reference to the active transcript and manage the associated transcriber lifecycle.

#### Scenario: Switch Transcript while Idle
Given an idle controller with an existing transcript
When a new transcript is provided via `setTranscript`
Then the controller should update its internal reference to the new transcript
And the state should remain idle
And the previous transcriber (if any) should be stopped

#### Scenario: Switch Transcript while Capturing
Given a capturing controller
When the active transcript is replaced with a new one via `setTranscript`
Then the capture should be stopped
And the current transcriber should be stopped
And the state should transition to `idle`
And the controller should associate the new transcript
And a new transcriber should be created for the new transcript

