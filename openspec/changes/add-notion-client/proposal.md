## Why

The Notion API does not support CORS, preventing direct access from the frontend browser application. To enable Notion integration, we need a backend proxy to securely forward requests using our existing OAuth credentials.

## What Changes

- Add the Notion JS SDK (`@notionhq/client`) to the frontend project.
- Implement a backend proxy endpoint in Go to forward requests to the Notion API.
- Configure the frontend Notion client to route requests through the backend proxy.
- Utilize existing Notion OAuth credentials in the backend for authentication.
- Implement basic page querying functionality using the Notion SDK data models.

## Capabilities

### New Capabilities
- `notion-client`: Frontend wrapper and configuration for the Notion SDK to communicate via the proxy.
- `notion-proxy`: Backend service to proxy authenticated requests to the Notion API.
- `notion-page-query`: Functionality to query Notion page hierarchy, including databases and datasources.

### Modified Capabilities
- `notion-auth`: Will be utilized by the proxy to authenticate requests.

## Impact

- **Frontend**: New dependency on `@notionhq/client`. New service/module for Notion interaction.
- **Backend**: New HTTP handler/route for proxying Notion requests.
- **Security**: Secure handling of OAuth tokens within the backend proxy.
