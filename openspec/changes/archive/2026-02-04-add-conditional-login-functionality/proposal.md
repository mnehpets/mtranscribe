## Why

Enable integration with external services' APIs that require authentication.

## What Changes

- **New**: Authentication check service that calls `/auth/me`
- **New**: Popup-based login flow with `next_url` parameter
- **New**: Callback handler that receives auth result and closes popup

## Capabilities

### New Capabilities
- `user-auth`: Authentication flow for external API integration

### Modified Capabilities
- (none) - This is a new feature, not modifying existing spec-level requirements

## Impact

New code only. No existing code depends on this.