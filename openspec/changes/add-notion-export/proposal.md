## Why

Users currently can only view or download transcripts as Markdown. Integrating direct export to Notion allows users to seamlessly save their transcriptions into their personal or team knowledge base, improving workflow efficiency and organization.

## What Changes

- **Add Notion Export Option**: Introduce a "Notion" option in the export destination list.
- **Location Selection**: Implement a UI for users to search and select a destination (parent page or database) within their connected Notion workspace.
- **Page Creation**: Automatically create a new page in Notion at the selected location with the transcript content formatted appropriately.
- **Authentication Check**: Ensure the user is authenticated with Notion before attempting export, prompting for login if necessary.

## Capabilities

### New Capabilities
- `notion-export`: Covers the requirements for selecting a Notion destination (page/database) and creating the exported page with transcript content.

### Modified Capabilities
- `export-functionality`: Update requirements to include Notion as a mandatory export destination alongside existing options.

## Impact

- **Frontend**: 
    - Updates to `ExportView.vue` to include the Notion option.
    - Updates to `SettingsView.vue` for Notion destination configuration.
    - New components for Notion page/database search and selection.
    - Integration with `notion.ts` client for API calls.
- **Backend**: None. The implementation will rely entirely on the existing `notion-proxy` capabilities.
- **External**: Depends on Notion API availability and user permissions.
