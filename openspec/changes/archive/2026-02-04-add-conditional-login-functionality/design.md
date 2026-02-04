## Context

The frontend needs to integrate with external services that require authentication. The backend provides:
- `/auth/me` - Returns current authentication status
- `/auth/login/blah` - Login endpoint that accepts `next_url` parameter for post-auth redirect

The authentication flow must work via popup windows to avoid disrupting the main application context.

## Goals / Non-Goals

**Goals:**
- Provide a simple auth check service that returns login status
- Enable popup-based authentication flow
- Handle post-authentication callback to close popup and notify parent
- Keep the API minimal and caller-driven

**Non-Goals:**
- Auto-triggering login flows (caller decides)
- Managing user sessions or tokens
- Restricting access to UI components
- Complex authentication state management

## Decisions

**1. Service-based architecture over Vue composables**
- Decision: Create a standalone `AuthService` class
- Rationale: Can be used anywhere (components, composables, utilities) without Vue dependency
- Alternative: Vue composable only - would limit usage to Vue components

**2. Popup window approach**
- Decision: Use `window.open()` for authentication
- Rationale: Keeps main app context, works with external auth providers, simple implementation
- Alternative: Full-page redirect - would lose app state

**3. Callback handler as distinct route in main frontend**
- Decision: Use a dedicated route (e.g., `/u/auth-callback`) to handle post-auth redirect
- Rationale: Follows frontend route convention, full app context available, no separate entry point needed
- Alternative: Separate entry point - adds complexity without benefit

**4. Caller-driven flow**
- Decision: Check service returns status, caller decides next action
- Rationale: Maximum flexibility for different use cases
- Alternative: Auto-trigger login - would be less flexible

**5. Minimal state management**
- Decision: No reactive auth state store
- Rationale: Simple use case doesn't require it, caller can cache if needed
- Alternative: Global store - adds complexity without clear benefit

**6. Single active auth flow**
- Decision: Track if auth flow is in progress, reject new requests while active
- Rationale: Prevents multiple popups, avoids race conditions, keeps UX clean
- Alternative: Allow concurrent flows - would create multiple popups and confusion

## Risks / Trade-offs

**[Risk]** Popup blockers may prevent window opening
→ Mitigation: Only open popup on explicit user action (click handler)

**[Risk]** Popup closed before auth completes
→ Mitigation: Service monitors popup and detects closure without result

**[Risk]** Backend authentication fails
→ Mitigation: Callback passes error to parent, closes popup, user retries action manually

**[Trade-off]** No automatic retry logic
→ Acceptable: User manually retries the action that triggered login

**[Trade-off]** No persistent session caching
→ Acceptable: Backend handles session, frontend just checks when needed