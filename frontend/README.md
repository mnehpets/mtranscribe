# mtranscribe

## Notion Integration

This project integrates with Notion via a secure backend proxy.

### Setup

1. Configure Notion OAuth credentials in `.env` or environment variables:
   - `NOTION_CLIENT_ID`
   - `NOTION_CLIENT_SECRET`
   - `NOTION_AUTH_URL`
   - `NOTION_TOKEN_URL`

2. The backend exposes a proxy at `/api/notion/`.
3. The frontend uses `@notionhq/client` configured to use this proxy.

### Usage (Frontend)

```typescript
import { notion, getHierarchy } from '@/services/notion';

// Use the notion client directly
const response = await notion.search({ ... });

// Use helper functions
const tree = await getHierarchy();
```

### Security

The backend proxy (`/api/notion/`) ensures that:
- Notion OAuth tokens are never exposed to the frontend.
- Only authenticated users with a valid session can access the Notion API.
- Requests are transparently forwarded to `https://api.notion.com`.
