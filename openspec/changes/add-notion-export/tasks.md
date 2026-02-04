## 1. Shared Components & Utilities

- [ ] 1.1 Refactor `NotionTreeNode.vue` and `getHierarchy` into a reusable `NotionPageSelector` component that emits selection events.
- [ ] 1.2 Implement `transcriptToNotionBlocks` utility function to convert `Transcript` objects into Notion Block objects.
- [ ] 1.3 Update `Config.ts` or Store to persist the selected Notion export destination ID.

## 2. Settings View Implementation

- [ ] 2.1 Update `SettingsView.vue` to add a "Notion Export" section.
- [ ] 2.2 Implement authentication check in Settings: show "Connect Notion" if not authenticated, or the destination selector if authenticated.
- [ ] 2.3 Integrate `NotionPageSelector` into Settings to allow users to browse and select a default export destination.
- [ ] 2.4 Implement saving the selected destination to configuration.

## 3. Export View Implementation

- [ ] 3.1 Update `ExportView.vue` to include "Notion" as an export destination option.
- [ ] 3.2 Add validation logic: Disable Notion export if not authenticated or no destination configured (with helpful tooltips/prompts).
- [ ] 3.3 Implement the "Export" action handler: calling `transcriptToNotionBlocks` and then the Notion API via `notion.ts`/proxy.
- [ ] 3.4 Add success/error handling for the export process (notifications, links to created page).

## 4. Testing & Verification

- [ ] 4.1 Add unit tests for `transcriptToNotionBlocks` conversion logic.
- [ ] 4.3 Verify page creation in Notion with correct hierarchy and content.
