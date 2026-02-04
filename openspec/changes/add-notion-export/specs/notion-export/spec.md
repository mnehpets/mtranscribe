# notion-export Specification

## Purpose
Define requirements for exporting transcripts to Notion.

## ADDED Requirements

### Requirement: Notion Authorization
The system MUST verify Notion authorization status before allowing the user to select a destination.

#### Scenario: User Not Authenticated
- **WHEN** user selects "Notion" from export options
- **AND** user is NOT currently authenticated with Notion
- **THEN** system displays a "Connect Notion" button
- **AND** export controls are disabled until connected

#### Scenario: User Authenticated
- **WHEN** user selects "Notion" from export options
- **AND** user is already authenticated with Notion
- **THEN** system displays destination selection controls

### Requirement: Destination Configuration
The system MUST allow users to configure a default Notion page or database in Settings to serve as the parent for exports.

#### Scenario: Browse for Destination
- **WHEN** user opens the destination selector in Settings
- **THEN** system queries Notion API for available pages and databases
- **AND** displays results in a hierarchical tree view

#### Scenario: Save Default Destination
- **WHEN** user selects a page or database from the tree view
- **THEN** that item is saved as the default export destination

### Requirement: Page Creation
The system MUST create a new page within the configured default destination in Notion.

#### Scenario: Execute Export
- **WHEN** user selects "Notion" export
- **AND** a default destination is configured
- **AND** user clicks the "Export" button
- **THEN** system sends a request to create a page in Notion
- **AND** the new page is a child of the configured default destination
- **AND** the page title matches the transcript title
- **AND** the page content is populated with the transcript text
- **AND** a success message is shown with a link to the created page

#### Scenario: Missing Configuration
- **WHEN** user selects "Notion" export
- **AND** no default destination is configured
- **THEN** system prompts user to configure destination in Settings
- **AND** export is disabled
