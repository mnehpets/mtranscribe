## 1. Backend Proxy Implementation

- [x] 1.1 Create a new Go handler for the Notion proxy endpoint (e.g., `/api/notion/`).
- [x] 1.2 Implement request forwarding logic using `httputil.ReverseProxy` or custom `http.Client`.
- [x] 1.3 Integrate with `notion-auth` to retrieve the authenticated user's Notion OAuth token.
- [x] 1.4 Inject the `Authorization: Bearer <token>` header into the proxied request.
- [x] 1.5 Register the new route in the main server configuration.
- [x] 1.6 Add unit tests for the proxy handler (mocking Notion API responses).

## 2. Frontend Client Setup

- [x] 2.1 Install `@notionhq/client` dependency in the frontend project.
- [x] 2.2 Create a `NotionClient` service/module in `src/services/notion.ts` (or similar).
- [x] 2.3 Configure the Notion client instance with `baseUrl` pointing to the backend proxy.
- [x] 2.4 Ensure the client is configured to handle authentication via the proxy (empty auth token in client).

## 3. Page Querying Feature

- [x] 3.1 Implement functions to query Notion pages and databases (e.g., `search`, `queryDatabase`).
- [x] 3.2 Implement logic to construct a page hierarchy from the query results.
- [x] 3.3 Use Notion SDK types (e.g., `PageObjectResponse`, `DatabaseObjectResponse`) for type safety.
- [x] 3.4 Create a simple UI component or view to test fetching and displaying the page hierarchy.
- [x] 3.5 Verify end-to-end flow: Frontend -> Proxy -> Notion API -> Proxy -> Frontend.

## 4. Documentation & Cleanup

- [x] 4.1 Document the proxy endpoint and security considerations.
