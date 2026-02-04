# notion-client Specification

## Purpose
TBD - created by archiving change add-notion-client. Update Purpose after archive.
## Requirements
### Requirement: Notion Client Configuration
The frontend application SHALL provide a configured instance of the Notion Client that routes requests through the backend proxy.

#### Scenario: Client Initialization
- **WHEN** the application initializes the Notion client
- **THEN** the client `baseUrl` is set to the backend proxy endpoint
- **AND** the client is configured with an empty `auth` token (authentication is handled by the proxy)

### Requirement: Proxy Request Routing
The Notion Client SHALL correctly route API requests to the backend proxy, preserving the path and method intended for the Notion API.

#### Scenario: API Call Routing
- **WHEN** the client makes a request to `notion.pages.create`
- **THEN** the request is sent to the backend proxy endpoint (e.g., `/api/notion/v1/pages`)
- **AND** the request method matches the SDK call (e.g., POST)

