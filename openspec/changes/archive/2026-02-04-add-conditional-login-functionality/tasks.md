## 1. Setup

- [x] 1.1 Create `frontend/src/AuthService.ts` with TypeScript class structure
- [x] 1.2 Add JSDoc documentation for all public methods

## 2. Auth Check Service

- [x] 2.1 Implement `checkAuth()` method that calls `/auth/me`
- [x] 2.2 Handle successful response (return user info or true)
- [x] 2.3 Handle failed response (return false or error)
- [x] 2.4 Add unit tests for `checkAuth()` scenarios

## 3. Popup Login Flow & Callback

- [x] 3.1 Implement `loginWithPopup()` method
- [x] 3.2 Track active flow state (prevent concurrent popups)
- [x] 3.3 Open popup window to `/auth/login/blah?next_url=/u/auth-callback`
- [x] 3.4 Create `/u/auth-callback` route in frontend router
- [x] 3.5 Implement callback component to parse auth result, send to parent, and close popup
- [x] 3.6 Implement popup closure monitoring
- [x] 3.7 Add unit tests for popup flow and callback scenarios

## 4. Integration & Documentation

- [x] 4.1 Add usage examples to `AuthService` JSDoc
- [x] 4.2 Verify all TypeScript types are correct
- [x] 4.3 Run existing tests to ensure no regressions