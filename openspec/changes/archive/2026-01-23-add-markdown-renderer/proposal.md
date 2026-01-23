# Add Markdown Renderer

## Summary
Implement a client-side Markdown renderer for the Transcript model to enable future export and display capabilities.

## Motivation
Users may want to export their transcripts or view them in a simplified Markdown format. This change adds the rendering logic without hooking it into the UI yet.

## Proposed Changes
- Add a new `MarkdownRenderer` class or utility in `frontend/src/MarkdownRenderer.ts`.
- The renderer will accept a `Transcript` object and produce a Markdown string.
- The output should include:
    - Title
    - Summary
    - Notes
    - Chronological list of turns with speaker names and timestamps.

## Detailed Design
The renderer will follow this format:
```markdown
# [Title]

## Summary
[Summary text]

## Notes
[Notes text]

## Transcript
**[Speaker Name]** ([Timestamp])
[Text]

...
```
