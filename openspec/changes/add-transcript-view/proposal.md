# Add Transcript View

## Problem
The application currently lacks a visual representation of the conversation transcript. Users cannot see the history of what has been said.

## Solution
Implement a `TranscriptView` Vue component that renders the `Transcript` object. This view will display each turn on a new line, with the speaker's name bolded and color-coded.

## Risks
- Color accessibility: Ensure the chosen colors for speakers are readable against the background.
- Performance: Large transcripts might need virtualization, but we will start with a simple list for now.
