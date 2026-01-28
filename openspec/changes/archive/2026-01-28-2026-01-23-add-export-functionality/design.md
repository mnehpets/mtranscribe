# Export Functionality Design

## UI Design

The Export View will consist of:
-   **Header**: "Export Transcript"
-   **Toolbar**:
    -   **View Toggle**: Buttons to switch between "Preview" (rendered view) and "Markdown Source" (raw text).
    -   **Action**: "Download Markdown" button.
-   **Content Area**:
    -   **Preview Mode**: Displays the `TranscriptView` component.
    -   **Source Mode**: Displays a read-only text area with the generated Markdown content.

## Logic

1.  **Data Source**: `useRecordingSession` composable to access the `transcript` ref.
2.  **Rendering**: `MarkdownRenderer` class to convert `Transcript` object to Markdown string.
3.  **Download**:
    -   Create a `Blob` with the markdown content (MIME type `text/markdown`).
    -   Create a temporary `<a>` element with `href` pointing to the blob URL.
    -   Set `download` attribute to a filename (e.g., `transcript-{timestamp}.md` or based on title).
    -   Programmatically click the link.
    -   Revoke the object URL.

## Component Structure

-   `src/views/ExportView.vue`: Main container.
    -   Uses `MarkdownRenderer` to generate content.
    -   Displays content.
    -   Handles download click.
