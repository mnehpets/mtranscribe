# Design: Oneserve Backend Architecture

## Overview
The backend will leverage `github.com/mnehpets/oneserve` to unify static file serving, authentication, and API handling.

## Components

### 1. Filesystem (oneserve.Filesystem)
- We will map the `frontend/dist` directory (or equivalent build output) to the root URL `/`.
- Requests to `/` will be redirected to `/u`.
- Requests to `/u/*` will be explicitly routed to serve `index.html` (SPA support).

### 2. Authentication (oneserve.Auth)
- **Provider:** Notion (OAuth 2.0).
- **Implementation:** Use the OAuth handler in `oneserve/auth` to implement the OAuth flow.
  - **PreAuth Hook:** Ensure that the user is already logged in before starting the flow.
  - **Success Handler:**
    - Recheck that the user is already logged in.
    - Save the Notion auth token, refresh token, and expiry into a struct.
    - Save this struct into the session KV.
    - Do not relogin the user; this flow is used to fetch Notion credentials for the current logged-in user.
- **Session Usage:** The KV struct stored in the session can be used in subsequent HTTP requests by that user to construct an `oauth2.TokenSource` for a Notion API client.
- **Session Management:** Secure cookie-based session management using `oneserve`'s built-in session middleware.
  - Sessions are created explicitly via `/auth/login/anon`.
  - Notion authentication REQUIRES an existing session.

### 3. Endpoints (oneserve.Endpoints)
- `/auth/login/notion`: Initiates OAuth flow.
- `/auth/callback/notion`: Handles OAuth callback and session creation.
- `/auth/login/anon`: Creates an anonymous session (query param: `next_url`).
- `/auth/logout`: Destroys current session (query param: `next_url`).
- `/auth/me`: Returns current session status (authenticated/anonymous) and a flag indicating if Notion credentials have been saved in the session.
- `/u/*`: Frontend routes.

### 4. Configuration
- Configuration (Client ID, Client Secret) will be loaded from a `.env` file and combined with OS environment variables.
- **Implementation:** Use `ilyakaznacheev/cleanenv` to load configuration into a struct.
- **Security Constraint:** `cleanenv.ReadConfig` parses the `.env` file directly into the struct and checks OS environment variables for overrides. It does NOT automatically export `.env` values to the process environment (no `os.Setenv`), satisfying the security requirement.
- **Permissions:** Notion permissions (Capabilities) are configured in the Notion Developer Portal, not in the code.

## Data Flow
1. User visits `/`. Backend redirects to `/u`, then serves `index.html`.
2. User clicks "Login with Notion".
3. Browser redirects to `/auth/login/notion`.
4. Backend redirects to Notion OAuth authorization URL.
5. User approves. Notion redirects to `/auth/callback/notion` with code.
6. Backend exchanges code for token.
7. Backend stores token in session and redirects user back to app.
