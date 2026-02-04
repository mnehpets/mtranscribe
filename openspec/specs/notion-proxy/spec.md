# notion-proxy Specification

## Purpose
TBD - created by archiving change add-notion-client. Update Purpose after archive.
## Requirements
### Requirement: Transparent Proxying
The backend SHALL expose an HTTP endpoint (e.g., `/api/notion/`) that transparently forwards requests to the official Notion API (`https://api.notion.com`) and returns the response to the client, preserving the path, query parameters, body, and status codes.

#### Scenario: Request/Response Forwarding
- **WHEN** a client requests any Notion API path (e.g., `/api/notion/v1/pages`, `/api/notion/v1/databases/query`)
- **THEN** the proxy forwards the request to the corresponding path at `https://api.notion.com` (e.g., `/v1/pages`, `/v1/databases/query`)
- **AND** returns the Notion API response (status, headers, body) to the client

### Requirement: Authentication Injection
The backend proxy SHALL inject the authenticated user's Notion OAuth token into the `Authorization` header of the forwarded request.

#### Scenario: Token Injection
- **WHEN** an authenticated user makes a request to the proxy
- **THEN** the proxy retrieves the user's Notion token
- **AND** adds `Authorization: Bearer <token>` to the upstream request headers

