# Add Export Functionality

## Summary
Add a new view to export the transcript. The initial implementation will support previewing and downloading the transcript as a Markdown file.

## Problem
Users can record transcripts but have no way to export them out of the application.

## Solution
Implement an `ExportView` that:
1.  Retrieves the current transcript.
2.  Renders it to Markdown using the existing `MarkdownRenderer`.
3.  Displays a preview of the Markdown.
4.  Provides a button to download the Markdown file.

## Impact
- **Frontend**: New `ExportView.vue` implementation.
- **Specs**: New spec `export-functionality`.
