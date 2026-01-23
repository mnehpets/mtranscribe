# Transcript Model Specs

## ADDED Requirements

### Requirement: Turn Source Attribution
Each turn MUST indicate its origin source and support multiple source types.

#### Scenario: Transcribed Source
Given `updateInterim` is called with `source: 'transcribed'`
When the turn is initialized
Then its `source` property is set to `'transcribed'`

#### Scenario: Typed Source
Given `updateInterim` is called with `source: 'typed'`
When the turn is initialized
Then its `source` property is set to `'typed'`

#### Scenario: Generated Source
Given `updateInterim` is called with `source: 'generated'`
When the turn is initialized
Then its `source` property is set to `'generated'`

### Requirement: Concurrent Turn Updates
The `Transcript` model MUST support simultaneous updates from different sources without interleaving or fragmentation.

#### Scenario: Parallel Typing and Transcription
Given a `Transcript` with an active 'transcribed' turn "Hello"
When `updateInterim("Note", 'typed')` is called
Then a new 'typed' turn is created with "Note"
And the 'transcribed' turn remains active and unchanged
And the 'typed' turn becomes active for the 'typed' source

#### Scenario: Independent Updates
Given a `Transcript` with active turns for 'transcribed' and 'typed'
When `updateInterim("Hello world", 'transcribed')` is called
And `appendInterim(" book", 'typed')` is called
Then the 'transcribed' turn text is "Hello world"
And the 'typed' turn text is "Note book"

### Requirement: Turn Finalization
The `Transcript` model MUST support finalizing turns independently by source.

#### Scenario: Finalizing One Source
Given active turns for 'transcribed' and 'typed'
When `finalizeTurn('transcribed')` is called
Then the 'transcribed' turn is marked complete
And the 'typed' turn remains active

### Requirement: Interim Turn Updates
The `Transcript` model MUST distinguish between stable (committed) text and volatile (interim) text within a single turn.

#### Scenario: Replacing Interim Text (Deepgram)
Given a `Transcript` with an active turn
When `updateInterim("hello world")` is called
Then the turn's `interim` property becomes "hello world"
And the turn's `text` property remains unchanged

#### Scenario: Appending Stable Text (Deepgram is_final)
Given a `Transcript` with an active turn having `interim` "hello world"
When `appendStable("hello world.")` is called
Then the turn's `text` appends "hello world."
And the turn's `interim` is cleared

#### Scenario: Appending Interim Text (AI Streaming)
Given a `Transcript` with an active turn having `interim` "hello"
When `appendInterim(" world")` is called
Then the turn's `interim` becomes "hello world"

#### Scenario: Turn Visualization
Given a `Transcript` with a turn having `text` "Start." and `interim` " Continuing..."
Then the full display text of the turn is "Start. Continuing..."
