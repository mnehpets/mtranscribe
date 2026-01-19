# Spec: Notion Authentication

## ADDED Requirements

### Requirement: Notion OAuth Login
The backend MUST provide an endpoint to initiate Notion OAuth 2.0 authentication.

#### Scenario: Initiate Login
Given the backend is configured with Notion Client ID
And the user has an active session
When a user requests `GET /auth/login/notion?next_url=/u/auth-result`
Then the server redirects to `https://api.notion.com/v1/oauth/authorize` with the correct client ID and redirect URI.

#### Scenario: Initiate Login without Session
Given the user does NOT have an active session
When a user requests `GET /auth/login/notion`
Then the server returns an error (401 or 400) indicating a session is required.

### Requirement: OAuth Callback Handling
The backend MUST handle the OAuth callback, exchange the code for a token, and store it in the existing user session.

#### Scenario: Successful Callback
Given the user has authorized the app on Notion
And the user has an active session (anonymous or otherwise)
When the user is redirected to `GET /auth/callback/notion?code=VALID_CODE`
Then the server exchanges the code for an access token
And the server stores the Notion access token in the current session
And the server redirects the user to `/u/auth-result`.

#### Scenario: Callback without Session
Given the user has authorized the app on Notion
But the user does NOT have an active session
When the user is redirected to `GET /auth/callback/notion?code=VALID_CODE`
Then the server returns an error (401 or 400) indicating a session is required.

### Requirement: Configuration Loading
The backend MUST load configuration from a `.env` file if present, preferring OS environment variables if set, without polluting the process environment.

#### Scenario: Load from .env
Given a `.env` file exists with `NOTION_CLIENT_ID=env_file_id`
And the OS environment variable `NOTION_CLIENT_ID` is NOT set
When the application starts
Then the application configuration uses `env_file_id` for the Notion Client ID
And `os.Getenv("NOTION_CLIENT_ID")` returns empty (process env is unchanged).

#### Scenario: OS Environment Precedence
Given a `.env` file exists with `NOTION_CLIENT_ID=env_file_id`
And the OS environment variable `NOTION_CLIENT_ID` is set to `os_env_id`
When the application starts
Then the application configuration uses `os_env_id` for the Notion Client ID.
