# Backend

A Go backend for mtranscribe using the `oneserve` library for static file serving, session management, and OAuth authentication.

## Setup

1. **Install dependencies:**
   ```bash
   go mod download
   ```

2. **Configure environment:**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set the following required variables:
   - `SESSION_KEY`: A 32-byte (64 hex characters) secret key for session encryption. Generate with `openssl rand -hex 32`
   - `NOTION_CLIENT_ID`: Your Notion OAuth client ID from https://www.notion.so/my-integrations
   - `NOTION_CLIENT_SECRET`: Your Notion OAuth client secret

3. **Build the frontend:**
   ```bash
   cd ../frontend
   pnpm install
   pnpm run build
   cd ../backend
   ```

## Running

```bash
go run main.go
```

Or build and run:
```bash
go build -o mtranscribe-backend
./mtranscribe-backend
```

The server will start on port 8080 (configurable via `PORT` environment variable).

## Endpoints

### Static Serving
- `GET /` - Redirects to `/u/`
- `GET /u/*` - Serves the frontend SPA for all client-side routes
- `GET /assets/*` - Serves static assets (CSS, JS, etc.)

### Session Management
- `GET /auth/login/anon?next_url=/u/...` - Create anonymous session and redirect
- `GET /auth/logout?next_url=/u/...` - Destroy session and redirect
- `GET /auth/me` - Get current session status (JSON)

### Notion OAuth
- `GET /auth/login/notion?next_url=/u/...` - Initiate Notion OAuth flow (requires existing session)
- `GET /auth/callback/notion` - OAuth callback handler (internal)

## Testing

Run all tests:
```bash
go test -v ./...
```

Run specific test suites:
```bash
# Configuration tests
go test -v ./server/... -run TestLoadConfig

# Validation tests
go test -v ./server/... -run TestValidateNextURL

# Integration tests
go test -v ./server/... -run TestSessionManagement
```

## Security Features

- **CSRF Protection**: Session cookies use `SameSite=Lax` attribute
- **Open Redirect Prevention**: `next_url` parameter validated to only allow paths starting with `/u/` (or `/` for logout)
- **Secure Configuration**: `.env` file values not exported to process environment
- **Session Encryption**: ChaCha20-Poly1305 authenticated encryption for session cookies
- **OAuth PKCE**: Proof Key for Code Exchange enabled for Notion OAuth flow
- **Automatic Secure Cookies**: Cookies automatically use `Secure` flag when `PUBLIC_URL` starts with `https://`

## Configuration

All configuration is via environment variables (or `.env` file):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `8080` | HTTP server port |
| `SESSION_KEY` | Yes | - | 32-byte hex-encoded session encryption key |
| `NOTION_CLIENT_ID` | Yes | - | Notion OAuth client ID |
| `NOTION_CLIENT_SECRET` | Yes | - | Notion OAuth client secret |
| `PUBLIC_URL` | No | `http://localhost:8080` | Public base URL for OAuth callbacks |
| `FRONTEND_DIR` | No | `../frontend/dist` | Path to frontend build directory |

## Architecture

The backend is structured as follows:

- `main.go` - Entry point
- `server/config.go` - Configuration loading
- `server/server.go` - HTTP server and routing
- `server/util.go` - Utility functions (URL validation)
- `server/*_test.go` - Unit and integration tests

The server uses:
- **oneserve** for endpoint handling, static file serving, sessions, and OAuth
- **koanf** for configuration management
