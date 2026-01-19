# Backend

A Go backend for mtranscribe built with [oneserve](https://github.com/mnehpets/oneserve).

## Features

- **Static File Serving**: Serves the compiled frontend SPA with proper routing
- **Session Management**: Secure cookie-based sessions with CSRF protection
- **Notion OAuth**: Authentication via Notion OAuth 2.0
- **Configuration**: Environment-based configuration with `.env` file support

## Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Configure environment variables in `.env`:
   - `PORT`: Server port (default: 8080)
   - `NOTION_CLIENT_ID`: Your Notion OAuth client ID
   - `NOTION_CLIENT_SECRET`: Your Notion OAuth client secret
   - `SESSION_KEY`: A secure 32-byte key for session encryption (generate one for production)

3. Build the frontend:
```bash
cd ../frontend
pnpm install
pnpm build
```

## Running

Development mode:
```bash
go run main.go
```

Build and run:
```bash
go build -o bin/mtranscribe .
./bin/mtranscribe
```

The server will start on the configured port (default: 8080).

## Endpoints

### Authentication
- `GET /auth/login/anon?next_url=/u/path` - Create anonymous session and redirect
- `GET /auth/logout?next_url=/u` - Destroy session and redirect
- `GET /auth/me` - Get current session status (JSON)
- `GET /auth/login/notion?next_url=/u/path` - Initiate Notion OAuth flow (requires session)
- `GET /auth/callback/notion` - Notion OAuth callback handler

### Static Files
- `GET /` - Redirects to `/u`
- `GET /u/*` - Serves frontend SPA (index.html for all routes)
- `GET /assets/*` - Serves static assets

## Configuration

Configuration is loaded from environment variables with fallback to `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `HOST` | Server host | (empty) |
| `FRONTEND_DIST_DIR` | Frontend build directory | `../frontend/dist` |
| `SESSION_KEY` | Session encryption key (32 bytes) | (generated, not persisted) |
| `SECURE_COOKIE` | Enable secure cookies (HTTPS only) | `false` |
| `NOTION_CLIENT_ID` | Notion OAuth client ID | (empty) |
| `NOTION_CLIENT_SECRET` | Notion OAuth client secret | (empty) |
| `NOTION_REDIRECT_URL` | Notion OAuth redirect URL | `http://localhost:8080/auth/callback/notion` |
| `NOTION_SCOPES` | Comma-separated OAuth scopes | (empty) |

**Security Notes:**
- Values from `.env` are NOT set in the process environment to prevent secret leakage
- Environment variables take precedence over `.env` file values
- Generate a secure random `SESSION_KEY` for production deployments
- Set `SECURE_COOKIE=true` in production (requires HTTPS)

## Testing

Run tests:
```bash
go test ./...
```

Run tests with coverage:
```bash
go test ./... -cover
```

## Development

Format code:
```bash
gofmt -w .
```

Lint code:
```bash
go vet ./...
```
