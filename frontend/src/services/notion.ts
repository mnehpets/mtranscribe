import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  DatabaseObjectResponse,
  PartialPageObjectResponse,
  PartialDatabaseObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

/**
 * Configured Notion Client that routes requests through the backend proxy.
 * Authentication is injected by the backend, so we leave the auth token empty here.
 */
export const notion = new Client({
  auth: "", // Authentication is handled by the backend proxy
  baseUrl: window.location.origin + "/api/notion",
});

export type NotionObject = PageObjectResponse | DatabaseObjectResponse;

export interface HierarchyNode {
  id: string;
  title: string;
  type: "page" | "database";
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
  const response = await notion.search({ page_size: 100 });
  
  // Filter out partial responses
  const items = response.results.filter((item): item is NotionObject => 
    "parent" in item
  );

  const nodeMap = new Map<string, HierarchyNode>();
  const roots: HierarchyNode[] = [];

  // 1. Create nodes
  for (const item of items) {
    let title = "Untitled";
    if (item.object === "page") {
      title = getPageTitle(item);
    } else if (item.object === "database") {
      title = item.title[0]?.plain_text || "Untitled Database";
    }

    nodeMap.set(item.id, {
      id: item.id,
      title,
      type: item.object,
      children: [],
      data: item,
    });
  }

  // 2. Build tree
  for (const item of items) {
    const node = nodeMap.get(item.id)!;
    const parent = item.parent;

    let parentId: string | null = null;
    if (parent.type === "page_id") parentId = parent.page_id;
    else if (parent.type === "database_id") parentId = parent.database_id;

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
    if (prop.type === "title") {
      return prop.title[0]?.plain_text || "Untitled";
    }
  }
  return "Untitled";
}
