# Transcript View Spec

## ADDED Requirements

### Requirement: Display Transcript Turns
The system MUST be able to render the list of turns from a provided Transcript object.

#### Scenario: Rendering a list of turns
Given a Transcript object with multiple turns
When the TranscriptView component is rendered
Then each turn is displayed in the view
And the turns are ordered chronologically (as they appear in the array)

### Requirement: Speaker Identification and Styling
The system MUST visually distinguish speakers and clearly separate speaker names from the text.

#### Scenario: Speaker styling
Given a turn with a speaker name "Alice"
When the turn is displayed
Then "Alice" is shown in bold text
And "Alice" is colored using a consistent color derived from the name
And a colon ":" follows the speaker name

#### Scenario: Turn layout
Given multiple turns
When they are displayed
Then each turn appears on a new line (block element)
And the view uses minimal additional visual elements (no borders, cards, or excessive padding by default)

### Requirement: Display Transcript Metadata
The system MUST display the transcript title and notes if they exist.

#### Scenario: Display Title
Given a Transcript object with a title "Meeting Minutes"
When the TranscriptView component is rendered
Then the title "Meeting Minutes" is displayed at the top of the view in a prominent header

#### Scenario: Display Notes
Given a Transcript object with notes "Action items: ..."
When the TranscriptView component is rendered
Then the notes are displayed in a collapsible section labeled "Notes"
And the notes section is collapsed by default (or user interaction is required to expand it)
