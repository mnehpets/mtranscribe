# user-auth Specification

## Purpose
TBD - created by archiving change add-conditional-login-functionality. Update Purpose after archive.
## Requirements
### Requirement: Auth check service
The system SHALL provide an authentication check service that calls `/auth/me` and returns the current login status.

#### Scenario: User is logged in
- **WHEN** the auth check service is called
- **THEN** it returns a truthy value indicating authenticated status

#### Scenario: User is not logged in
- **WHEN** the auth check service is called
- **THEN** it returns a falsy value indicating unauthenticated status

#### Scenario: Backend endpoint unavailable
- **WHEN** the auth check service is called
- **THEN** it returns an error or falsy value

### Requirement: Popup-based login flow
The system SHALL open a popup window to the backend login endpoint with a `next_url` parameter pointing to the frontend callback route, and monitor the active flow.

#### Scenario: Login flow initiated
- **WHEN** a caller requests login with a next URL
- **THEN** a popup window opens to `/auth/login/blah?next_url=<callback_url>`

#### Scenario: Single active flow
- **WHEN** a login flow is already in progress
- **THEN** subsequent login requests are rejected with an error

#### Scenario: Popup blocked
- **WHEN** popup blocker prevents window opening
- **THEN** the login request returns an error

#### Scenario: Flow completes successfully
- **WHEN** auth completes and callback notifies parent
- **THEN** the service resolves the login request with success

#### Scenario: Flow fails
- **WHEN** popup closes or callback reports error
- **THEN** the service rejects the login request with appropriate error

### Requirement: Callback handler
The system SHALL provide a callback route that receives authentication results from the backend and closes the popup.

#### Scenario: Successful authentication
- **WHEN** the callback route receives valid auth result
- **THEN** it sends the result to the parent window and closes itself

#### Scenario: Failed authentication
- **WHEN** the callback route receives an error or invalid result
- **THEN** it sends the error to the parent window and closes itself

#### Scenario: Popup closure detection
- **WHEN** the popup closes before auth completes
- **THEN** the parent service detects the closure and reports failure

