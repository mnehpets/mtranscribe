# session-management Specification

## Purpose
TBD - created by archiving change implement-oneserve-backend. Update Purpose after archive.
## Requirements
### Requirement: Anonymous Login Endpoint
The backend MUST provide an endpoint to explicitly create an anonymous session.

#### Scenario: Anonymous Login with Redirect
Given a user does not have a session
When the user requests `POST /auth/login/anon?next_url=/u/dashboard`
Then the server establishes a new anonymous session
And the server sets a session cookie
And the server redirects the user to `/u/dashboard`.

### Requirement: Logout Endpoint
The backend MUST provide an endpoint to clear the session.

#### Scenario: Logout with Redirect
Given a user has an active session
When the user requests `POST /auth/logout?next_url=/`
Then the server invalidates the current session
And the server clears the session cookie
And the server redirects the user to `/`.

### Requirement: CSRF Protection
State-changing endpoints (like login/logout) MUST be protected against Cross-Site Request Forgery (CSRF).

#### Scenario: CSRF Mitigation
Given the application uses `oneserve`
When a user performs a state-changing request
Then the application MUST rely on `oneserve`'s secure session cookies (with `SameSite=Lax` or `Strict`) or equivalent mechanisms to prevent CSRF.

### Requirement: Redirect Security
The `next_url` parameter for login and logout endpoints MUST be validated to prevent Open Redirect vulnerabilities.

#### Scenario: Valid Redirect
Given a user requests a login or logout with `next_url=/u/dashboard`
Then the server accepts the redirect because it starts with `/u/`.

#### Scenario: Invalid Redirect
Given a user requests a login or logout with `next_url=https://evil.com`
Or `next_url=/admin` (not starting with `/u/`)
Then the server ignores the invalid `next_url` and redirects to a default safe path (e.g., `/u`).

### Requirement: Session Status Endpoint
The backend MUST provide an endpoint to check the current session status.

#### Scenario: Check Status
Given the backend is running
When a user requests `GET /auth/me`
Then the server returns a JSON response indicating if the user is logged in (anonymous or authenticated) and any relevant user data.

