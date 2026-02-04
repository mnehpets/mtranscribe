import { Client } from "@notionhq/client";
import type {
  DataSourceObjectResponse,
  DatabaseObjectResponse,
  PageObjectResponse,
} from "@notionhq/client";

/**
 * Configured Notion Client that routes requests through the backend proxy.
 * Authentication is injected by the backend, so we leave the auth token empty here.
 */
export const notion = new Client({
  auth: "", // Authentication is handled by the backend proxy
  baseUrl: window.location.origin + "/api/notion",
  fetch: window.fetch.bind(window),
});

export type NotionObject = PageObjectResponse | DatabaseObjectResponse | DataSourceObjectResponse;

export interface HierarchyNode {
  id: string;
  title: string;
  type: "page" | "database" | "data_source";
  children: HierarchyNode[];
  data: NotionObject;
}

/**
 * Searches for pages and databases.
 */
export async function search(query: string = "") {
  const response = await notion.search({
    query,
    sort: {
      direction: "descending",
      timestamp: "last_edited_time",
    },
  });
  return response.results;
}

/**
 * Retrieves the hierarchy of accessible pages and databases.
 */
export async function getHierarchy(): Promise<HierarchyNode[]> {
  // Notion search is paginated. Fetch all pages to avoid silently truncating
  // the hierarchy for larger workspaces.
  const results: unknown[] = [];
  let startCursor: string | undefined;

  for (;;) {
    const response = await notion.search({
      page_size: 100,
      ...(startCursor ? { start_cursor: startCursor } : {}),
    });
    results.push(...response.results);
    if (!response.has_more || !response.next_cursor) break;
    startCursor = response.next_cursor;
  }

  // Filter out partial responses (and non-page/database objects)
  const items: NotionObject[] = results.filter((item): item is NotionObject => {
    if (!item || typeof item !== "object") return false;
    if (!("object" in item) || !("parent" in item)) return false;
    const obj = (item as { object?: unknown }).object;
    return obj === "page" || obj === "database" || obj === "data_source";
  });

  // Notion's `search()` returns `pages` and `data_sources`, but not `databases`.
  // Collect database ids from parents and retrieve them explicitly, then add the
  // returned database objects into `items`.
  const databaseIds = new Set<string>();
  for (const item of items) {
    const parent = (item as any).parent;
    if (!parent || typeof parent !== "object" || !("type" in parent)) continue;
    if (parent.type === "database_id" && typeof parent.database_id === "string") {
      databaseIds.add(parent.database_id);
    }
  }

  for (const databaseId of Array.from(databaseIds)) {
    try {
      const db = await notion.databases.retrieve({ database_id: databaseId });
      // Ensure it matches our union even if the SDK typing changes.
      if (db && typeof db === "object" && (db as any).object === "database") {
        items.push(db as unknown as DatabaseObjectResponse);
      }
    } catch {
      // Ignore retrieve failures (permissions, deleted databases, etc.) and keep building
      // a best-effort hierarchy.
    }
  }

  const nodeMap = new Map<string, HierarchyNode>();
  const roots: HierarchyNode[] = [];

  // 1. Create nodes
  for (const item of items) {
    let title = "Untitled";
    if (item.object === "page") {
      title = getPageTitle(item);
    } else if (item.object === "database") {
      title = item.title[0]?.plain_text || "Untitled Database";
    } else if (item.object === "data_source") {
      title = item.title[0]?.plain_text || "Untitled Data Source";
    }

    nodeMap.set(item.id, {
      id: item.id,
      title,
      type: item.object as HierarchyNode["type"],
      children: [],
      data: item,
    });
  }

  // 2. Build tree
  for (const item of items) {
    const node = nodeMap.get(item.id)!;
    const parent = item.parent;

    let parentId: string | null = null;
    if (parent && typeof parent === "object" && "type" in parent) {
      const type = (parent as any).type;
      if (type === "page_id" && typeof (parent as any).page_id === "string") {
        parentId = (parent as any).page_id;
      } else if (type === "database_id" && typeof (parent as any).database_id === "string") {
        parentId = (parent as any).database_id;
      } else if (type === "data_source_id" && typeof (parent as any).data_source_id === "string") {
        parentId = (parent as any).data_source_id;
      }
    }

    if (parentId && nodeMap.has(parentId)) {
      nodeMap.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function getPageTitle(page: PageObjectResponse): string {
  for (const prop of Object.values(page.properties)) {
    // Notion SDK property union is wide; keep this local guard to satisfy TS.
    if (prop && typeof prop === "object" && "type" in prop && (prop as any).type === "title") {
      const title = (prop as any).title;
      return Array.isArray(title) ? title[0]?.plain_text || "Untitled" : "Untitled";
    }
  }
  return "Untitled";
}

