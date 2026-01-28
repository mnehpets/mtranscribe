# Export Functionality Specification

## Purpose
Define the behavior of the export functionality, including preview and file download.

## ADDED Requirements

### Requirement: Transcript Preview
The system MUST provide two modes of preview: Rendered and Raw Markdown.

#### Scenario: Default view
Given the user navigates to the Export page
Then the Rendered preview is shown by default
And the Rendered preview displays the formatted transcript (using TranscriptView)

#### Scenario: Toggle to Markdown
Given the user is viewing the Rendered preview
When the user selects the "Markdown" or "Source" option
Then the preview switches to show the raw Markdown text

#### Scenario: Toggle to Rendered
Given the user is viewing the Markdown preview
When the user selects the "Preview" or "Rendered" option
Then the preview switches to show the formatted transcript

### Requirement: Markdown Download
The system MUST allow the user to download the transcript as a Markdown file.

#### Scenario: Download file
Given the user is on the Export page
When the user clicks the "Download Markdown" button
Then a file download is initiated
And the filename contains "transcript"
And the file content matches the previewed markdown
