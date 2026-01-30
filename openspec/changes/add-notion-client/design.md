## Context

The frontend application needs to interact with the Notion API to read and write data. However, the Notion API does not support Cross-Origin Resource Sharing (CORS), which blocks direct requests from the browser. We already have a backend service (`oneserve`) and a mechanism for Notion OAuth authentication (`notion-auth`). We need to bridge the frontend and Notion API securely.

## Goals / Non-Goals

**Goals:**
- Enable the frontend to make authenticated requests to the Notion API.
- Securely manage Notion OAuth tokens on the backend, keeping them hidden from the client.
- Provide a seamless developer experience on the frontend using the official Notion JS SDK.
- Reuse existing backend infrastructure and authentication patterns.
- Leverage Notion SDK data models and implement basic page querying.

**Non-Goals:**
- Implementing a full-featured custom Notion API wrapper (we will proxy the official SDK).
- Caching Notion API responses (out of scope for this initial implementation).
- Complex rate limiting logic beyond what the Notion API provides (we will pass through headers).

## Decisions

### 1. Backend Proxy Strategy
**Decision:** Implement a transparent proxy endpoint in the Go backend that forwards requests to `https://api.notion.com`.
**Rationale:** This allows us to inject the Authorization header (Bearer token) on the server side, keeping credentials secure. It avoids the complexity of building a custom API layer that maps to Notion's extensive API.
**Alternatives:**
- *Custom API Wrapper:* Building specific endpoints for each Notion operation needed. *Rejected:* Too much maintenance overhead as Notion API evolves.
- *Serverless Function:* Using a separate lambda/function. *Rejected:* We already have a running backend service; adding another component increases operational complexity.

### 2. Frontend Client Configuration
**Decision:** Configure the `@notionhq/client` in the frontend to point to our backend proxy URL instead of the default Notion API base URL.
**Rationale:** The official SDK supports a `baseUrl` option. This allows us to use the standard SDK methods (e.g., `notion.pages.create`) while routing traffic through our proxy.
**Alternatives:**
- *Fetch Wrapper:* Manually using `fetch` to call our proxy. *Rejected:* Loses the type safety and convenience of the official SDK.

### 3. Authentication Flow
**Decision:** The frontend will authenticate with the backend using its existing session mechanism. The backend will look up the associated Notion OAuth token for the user and inject it into the proxied request.
**Rationale:** Decouples the frontend session from the Notion token. The frontend doesn't need to know the Notion token, reducing security risks.

### 4. Data Model Usage
**Decision:** Use the official Notion SDK's type definitions and data models for all frontend interactions.
**Rationale:** Ensures type safety and consistency with the Notion API. Reduces the need for manual type maintenance.
**Implementation:** Import types directly from `@notionhq/client` (e.g., `PageObjectResponse`, `QueryDatabaseResponse`).

## Risks / Trade-offs

- **Risk:** Proxy Latency. **Mitigation:** The proxy adds a hop. We will use Go's efficient `httputil.ReverseProxy` or a lightweight custom forwarder to minimize overhead.
- **Risk:** API Rate Limiting. **Mitigation:** We will forward Notion's rate limit headers to the frontend so the SDK or application logic can handle backoff.
- **Risk:** Security of Tokens. **Mitigation:** Tokens are stored securely in the backend and never exposed to the browser. The proxy only forwards requests for authenticated users.

## Migration Plan

1.  **Backend:** Implement the proxy handler and register the route.
2.  **Frontend:** Install `@notionhq/client`, configure the client instance, and update API calls to use this instance.
3.  **Testing:** Verify end-to-end flow with a test Notion page.
