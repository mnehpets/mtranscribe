# export-functionality Specification

## ADDED Requirements

### Requirement: Export Destination Selection
The system MUST allow the user to choose the destination/format for the export.

#### Scenario: View Options
- **WHEN** user navigates to the Export page
- **THEN** the system displays a selection of export destinations
- **AND** "Markdown File" is available
- **AND** "Notion" is available

## MODIFIED Requirements

### Requirement: Markdown Download
The system MUST allow the user to download the transcript as a Markdown file.

#### Scenario: Download file
- **WHEN** user selects "Markdown File" as the destination
- **AND** clicks the "Export" or "Download" button
- **THEN** a file download is initiated
- **AND** the filename contains "transcript"
- **AND** the file content matches the previewed markdown
