## Context

The application currently supports exporting transcripts as Markdown downloads. Users have requested direct integration with Notion to streamline their knowledge management workflow. The backend `notion-proxy` already exists to proxy requests to the Notion API, but the frontend lacks the UI and logic to handle page creation and destination selection. We need to implement a "Notion" export option that allows users to select a destination page/database in Settings and export transcripts as new pages.

## Goals / Non-Goals

**Goals:**
- Enable users to export transcripts directly to a Notion page.
- Provide a settings interface to configure the default export destination (parent page or database).
- Use a tree-view UI for browsing and selecting the Notion destination.
- Reuse existing `notion-proxy` and `notion.ts` infrastructure.
- Ensure a seamless authentication flow (prompting for connection if needed).

**Non-Goals:**
- Supporting export to multiple different Notion workspaces simultaneously (assume one connected workspace).
- Bi-directional sync (Notion to Transcript updates).
- Complex custom block layouts beyond standard text and headings.

## Decisions

### 1. Destination Selection in Settings
**Decision:** Implement the Notion destination selector within `SettingsView.vue` rather than `ExportView.vue`.
**Rationale:** This reduces friction during the export process. Users configure the destination once (e.g., a "Transcripts" database) and can then quickly export subsequent transcripts without re-selecting the location every time. It keeps the `ExportView` clean and focused on the action.
**Alternatives Considered:**
- *Selection in ExportView:* Would require selecting the destination for every export, adding clicks and cognitive load.
- *Hybrid:* Default in settings, override in export. Adds complexity to the UI; "set and forget" is sufficient for the MVP.

### 2. Tree View for Destination Browsing
**Decision:** Reuse the existing `NotionTreeNode.vue` and `getHierarchy` logic to build the destination selector.
**Rationale:** A tree view implementation already exists in `NotionTestView.vue`. We can extract this into a reusable `NotionPageSelector` component for use in Settings.
**Implementation:** Refactor the logic from `NotionTestView.vue` to allow selection (emitting a `select` event) and integrate it into `SettingsView.vue`. The existing `getHierarchy` function (likely in `notion.ts`) will need to be verified for scalability, but the UI component is ready.

### 3. Transcript-to-Blocks Conversion
**Decision:** We will convert the `Transcript` object directly to Notion Blocks on the client-side, independent of the Markdown renderer.
**Rationale:** The `Transcript` model contains structured data (speakers, timestamps, text) that can be more accurately represented in Notion blocks (e.g., using headings for speakers, specialized formatting) than by parsing generated Markdown. This decouples the export formats.
**Alternatives Considered:**
- *Markdown-to-Blocks:* Parsing the markdown output. This adds an unnecessary intermediate step and loss of structural fidelity.

## Risks / Trade-offs

- **[Risk] Notion API Rate Limits:** Deep tree traversal or frequent searches could hit rate limits.
    - *Mitigation:* Implement caching for the destination selector and use debounced search if we switch to search-based selection. For the tree view, load children only on expansion.
- **[Risk] Block Limit per Request:** Notion API has limits on the number of blocks in a `children` array (100 blocks).
    - *Mitigation:* The export logic must split the content into chunks of 100 blocks and append them sequentially if the transcript is long.
- **[Risk] Authentication State:** Token expiration or revocation.
    - *Mitigation:* Robust error handling in the export flow to detect 401s and prompt the user to re-connect.

## Migration Plan
No database migration required (client-side configuration).
- Deploy updated Frontend.
- No changes to Backend.
