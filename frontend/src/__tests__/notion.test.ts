import { describe, it, expect, vi, beforeEach } from 'vitest';
import { search, getHierarchy } from '../notion';

// Mock the Notion Client
vi.mock('@notionhq/client', () => {
  const Client = vi.fn();
  Client.prototype.search = vi.fn();
  Client.prototype.databases = {
    retrieve: vi.fn(),
  };
  return { Client };
});

describe('notion.ts', () => {
  let mockSearch: any;
  let mockRetrieve: any;
  // Access the mocked instance methods
  // Since `notion` is exported as a singleton instance from notion.ts, 
  // and we mocked the class, we need to get the methods from the prototype or the instance.
  // Ideally, we can just spy on the methods if we had access to the instance, 
  // but since we mocked the class constructor, we can grab the methods from the mock logic if we structured it that way.
  // However, simpler is to just import the `notion` object and spy on it?
  // But `notion` is a const.
  
  // Actually, since we mocked the module '@notionhq/client', the `new Client()` call in `notion.ts`
  // returned our mock object.
  // We can get access to the methods via the Client.prototype or by importing the notion object.
  
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // We can also import the 'notion' instance to attach mocks dynamically if needed, 
    // but setting them on the prototype in the factory is easier for global mocks.
    // However, to change return values per test, we need access to the spies.
    
    // Let's re-import or use the one we have.
    const { notion } = await import('../notion');
    mockSearch = notion.search as any;
    mockRetrieve = notion.databases.retrieve as any;
  });

  describe('search', () => {
    it('calls notion.search with query and default sort', async () => {
      mockSearch.mockResolvedValue({ results: [] });
      
      const query = 'test query';
      await search(query);
      
      expect(mockSearch).toHaveBeenCalledWith({
        query,
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time',
        },
      });
    });

    it('returns results from notion.search', async () => {
      const mockResults = [{ id: '1', object: 'page' }];
      mockSearch.mockResolvedValue({ results: mockResults });
      
      const results = await search('test');
      expect(results).toEqual(mockResults);
    });
  });

  describe('getHierarchy', () => {
    it('fetches all pages with pagination', async () => {
      // First page
      mockSearch.mockResolvedValueOnce({
        results: [{ id: 'page1', object: 'page', parent: { type: 'workspace' }, properties: {} }],
        has_more: true,
        next_cursor: 'cursor1',
      });
      // Second page
      mockSearch.mockResolvedValueOnce({
        results: [{ id: 'page2', object: 'page', parent: { type: 'workspace' }, properties: {} }],
        has_more: false,
        next_cursor: null,
      });

      const hierarchy = await getHierarchy();
      
      expect(mockSearch).toHaveBeenCalledTimes(2);
      expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({ page_size: 100 }));
      expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({ start_cursor: 'cursor1' }));
      
      // Both pages should be in the result (as roots since they have workspace parent)
      expect(hierarchy).toHaveLength(2);
      expect(hierarchy.map(n => n.id)).toContain('page1');
      expect(hierarchy.map(n => n.id)).toContain('page2');
    });

    it('builds a hierarchy with parent-child relationships', async () => {
      const pageParent = { 
        id: 'parent-page', 
        object: 'page', 
        parent: { type: 'workspace' },
        properties: { title: { type: 'title', title: [{ plain_text: 'Parent' }] } }
      };
      
      const pageChild = {
        id: 'child-page',
        object: 'page',
        parent: { type: 'page_id', page_id: 'parent-page' },
        properties: { title: { type: 'title', title: [{ plain_text: 'Child' }] } }
      };

      mockSearch.mockResolvedValue({
        results: [pageParent, pageChild],
        has_more: false,
      });

      const hierarchy = await getHierarchy();

      expect(hierarchy).toHaveLength(1); // Only the root
      const parentNode = hierarchy[0];
      expect(parentNode.id).toBe('parent-page');
      expect(parentNode.title).toBe('Parent');
      expect(parentNode.children).toHaveLength(1);
      expect(parentNode.children[0].id).toBe('child-page');
      expect(parentNode.children[0].title).toBe('Child');
    });

    it('retrieves databases referenced by pages', async () => {
      const pageInDb = {
        id: 'page-in-db',
        object: 'page',
        parent: { type: 'database_id', database_id: 'db-1' },
        properties: {}
      };

      const database = {
        id: 'db-1',
        object: 'database',
        title: [{ plain_text: 'My Database' }],
        parent: { type: 'workspace' }
      };

      mockSearch.mockResolvedValue({
        results: [pageInDb],
        has_more: false,
      });

      mockRetrieve.mockResolvedValue(database);

      const hierarchy = await getHierarchy();

      expect(mockRetrieve).toHaveBeenCalledWith({ database_id: 'db-1' });
      
      // Database should be the root, and page should be its child
      expect(hierarchy).toHaveLength(1);
      const dbNode = hierarchy[0];
      expect(dbNode.id).toBe('db-1');
      expect(dbNode.title).toBe('My Database');
      expect(dbNode.type).toBe('database');
      
      expect(dbNode.children).toHaveLength(1);
      expect(dbNode.children[0].id).toBe('page-in-db');
    });

    it('handles database retrieval errors gracefully', async () => {
       const pageInDb = {
        id: 'page-in-db',
        object: 'page',
        parent: { type: 'database_id', database_id: 'db-missing' },
        properties: {}
      };

      mockSearch.mockResolvedValue({
        results: [pageInDb],
        has_more: false,
      });

      mockRetrieve.mockRejectedValue(new Error('Not found'));

      const hierarchy = await getHierarchy();

      // Should return the page as a root since the parent database wasn't found in the map
      // Wait, the logic is:
      // 1. Collect all items (pages + retrieved databases)
      // 2. Build map
      // 3. Loop items to link parents.
      // If parent database is missing from items (because retrieve failed), 
      // `nodeMap.has(parentId)` will be false.
      // So it should be added to `roots`.
      
      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0].id).toBe('page-in-db');
    });
    
    it('filters out unsupported objects', async () => {
        mockSearch.mockResolvedValue({
            results: [
                { id: 'page1', object: 'page', parent: { type: 'workspace' }, properties: {} },
                { id: 'user1', object: 'user' }, // Should be filtered out
                { id: 'unknown', object: 'unknown' } // Should be filtered out
            ],
            has_more: false
        });

        const hierarchy = await getHierarchy();
        expect(hierarchy).toHaveLength(1);
        expect(hierarchy[0].id).toBe('page1');
    });
  });
});
