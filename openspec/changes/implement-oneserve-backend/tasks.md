# Tasks: Implement Oneserve Backend

- [x] Update `backend/go.mod` to include `github.com/mnehpets/oneserve`.
- [x] Create `backend/server/server.go` to encapsulate server logic.
- [x] Implement `.env` file loading logic using `cleanenv` (ensuring no process env pollution).
- [x] Configure `oneserve` session middleware (ensure `SameSite` attributes for CSRF protection).
- [x] Implement `/auth/login/anon` handler (validate `next_url` starts with `/u/`).
- [x] Implement `/auth/logout` handler (validate `next_url` starts with `/u/`).
- [x] Implement `/auth/me` handler to return session status.
- [x] Implement static file serving: redirect `/` to `/u`, serve `index.html` for `/u/*`.
- [x] Implement Notion OAuth client setup (configure Client ID and Secret; permissions are set in Notion Portal).
- [x] Implement `/auth/login/notion` handler.
- [x] Implement `/auth/callback/notion` handler: verify existing session, exchange code, store token.
- [x] Implement unit tests for configuration loading (env precedence).
- [x] Implement unit tests for `next_url` validation logic.
- [x] Implement integration tests for Session Management (`/auth/login/anon`, `/auth/logout`, `/auth/me`).
- [x] Implement integration tests for Static Serving (redirects, SPA fallback, 404s).
- [x] Implement integration tests for Notion Auth flow (mocking external calls).
- [x] Update `backend/main.go` to use the new server setup.
- [x] Verify frontend is served correctly at `http://localhost:8080`.
- [x] Verify Notion login flow redirects correctly (mock or real creds).

