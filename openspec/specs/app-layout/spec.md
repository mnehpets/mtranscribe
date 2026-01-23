# app-layout Specification

## Purpose
TBD - created by archiving change scaffold-app-layout. Update Purpose after archive.
## Requirements
### Requirement: Application Shell
The application SHALL provide a consistent shell for all users (authenticated or anonymous).

#### Scenario: Global Layout
Given a user accesses any page under `/u/`
Then they should see the global header
And they should see the main content area

### Requirement: Navigation Header
The header SHALL contain the app logo and navigation tabs.

#### Scenario: Header Elements
Given the user is on the app layout
Then they should see the application logo on the left
And they should see navigation tabs for "Capture", "Export", and "Settings"

### Requirement: Navigation Tabs
The tabs SHALL navigate to their respective views without a full page reload.

#### Scenario: Tab Navigation
Given the user clicks the "Capture" tab
Then the URL should change to `/u/`
And the Capture view should be displayed in the main content area

#### Scenario: Tab Selection State
Given the user is on the "/u/export" route
Then the "Export" tab should be visually selected

### Requirement: Routing Structure
The application SHALL use client-side routing mounted at `/u/`.

#### Scenario: Default Route
Given the user accesses `/u/`
Then the Capture view should be displayed

#### Scenario: Placeholder Views
Given the user navigates to "Capture", "Export", or "Settings"
Then they should see the corresponding placeholder view content

