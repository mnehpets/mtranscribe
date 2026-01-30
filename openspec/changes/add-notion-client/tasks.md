## 1. Backend Proxy Implementation

- [ ] 1.1 Create a new Go handler for the Notion proxy endpoint (e.g., `/api/notion/`).
- [ ] 1.2 Implement request forwarding logic using `httputil.ReverseProxy` or custom `http.Client`.
- [ ] 1.3 Integrate with `notion-auth` to retrieve the authenticated user's Notion OAuth token.
- [ ] 1.4 Inject the `Authorization: Bearer <token>` header into the proxied request.
- [ ] 1.5 Register the new route in the main server configuration.
- [ ] 1.6 Add unit tests for the proxy handler (mocking Notion API responses).

## 2. Frontend Client Setup

- [ ] 2.1 Install `@notionhq/client` dependency in the frontend project.
- [ ] 2.2 Create a `NotionClient` service/module in `src/services/notion.ts` (or similar).
- [ ] 2.3 Configure the Notion client instance with `baseUrl` pointing to the backend proxy.
- [ ] 2.4 Ensure the client is configured to handle authentication via the proxy (empty auth token in client).

## 3. Page Querying Feature

- [ ] 3.1 Implement functions to query Notion pages and databases (e.g., `search`, `queryDatabase`).
- [ ] 3.2 Implement logic to construct a page hierarchy from the query results.
- [ ] 3.3 Use Notion SDK types (e.g., `PageObjectResponse`, `DatabaseObjectResponse`) for type safety.
- [ ] 3.4 Create a simple UI component or view to test fetching and displaying the page hierarchy.
- [ ] 3.5 Verify end-to-end flow: Frontend -> Proxy -> Notion API -> Proxy -> Frontend.

## 4. Documentation & Cleanup

- [ ] 4.1 Update `README.md` with instructions on how to use the Notion client.
- [ ] 4.2 Document the proxy endpoint and security considerations.
