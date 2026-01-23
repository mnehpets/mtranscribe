# Transcript Rendering Specification

## Purpose
Define the behavior of the Transcript Markdown Renderer.

## ADDED Requirements

### Requirement: Markdown Output Format
The system MUST render the Transcript into a valid Markdown string following a specific structure.

#### Scenario: Render full transcript
Given a Transcript object with title "My Meeting", summary "Discussed project", notes "Action items", and turns
When the renderer processes the transcript
Then the output starts with "# My Meeting"
And includes "## Summary\nDiscussed project"
And includes "## Notes\nAction items"
And includes "## Transcript" section with turns

#### Scenario: Render empty fields
Given a Transcript with empty title, summary, or notes
When the renderer processes the transcript
Then the empty sections are omitted from the output

### Requirement: Turn Formatting
The system MUST render each turn with speaker, timestamp, and text.

#### Scenario: Render turn
Given a turn by "Alice" at "10:00" with text "Hello"
When the renderer processes the transcript
Then the turn is rendered as "**Alice** (10:00)\nHello\n"

#### Scenario: Turn ordering
Given multiple turns
When the renderer processes the transcript
Then the turns are listed in the order they appear in the Transcript object
