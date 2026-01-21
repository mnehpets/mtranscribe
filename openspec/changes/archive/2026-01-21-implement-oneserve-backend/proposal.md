# Proposal: Implement Backend with Oneserve

- **Change ID:** `implement-oneserve-backend`
- **Status:** Proposed
- **Created:** 2026-01-19

## Summary
Re-implement the backend using the `github.com/mnehpets/oneserve` library. The new backend will serve the frontend single-page application and provide authentication endpoints using Notion OAuth. Notion credentials will be stored in the user session.

## Problem
The current backend is a minimal HTTP server that does not serve the frontend files or handle authentication. We need a robust foundation for building the application features.

## Solution
Use `oneserve` to:
1.  Serve static files from the frontend build (with SPA routing).
2.  Manage user sessions (explicit anonymous login).
3.  Implement Notion OAuth authentication flow (requires existing session).
4.  Provide a structure for API endpoints.

## Impact
- **Backend:** Complete rewrite of `main.go` and `go.mod`.
- **Frontend:** Will be served by the backend at root `/`.
- **Security:** Introduces session management and OAuth.
