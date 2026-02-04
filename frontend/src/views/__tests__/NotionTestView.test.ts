import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import NotionTestView from '../NotionTestView.vue';
import { getHierarchy } from '../../notion';

// Mock the notion module
vi.mock('../../notion', () => ({
  getHierarchy: vi.fn(),
}));

// Stub the recursive component to simplify testing
const NotionTreeNodeStub = {
  template: '<div class="notion-tree-node-stub" :data-id="node.id">{{ node.title }}</div>',
  props: ['node', 'maxLevel']
};

describe('NotionTestView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    // Return a promise that doesn't resolve immediately to check loading state
    (getHierarchy as any).mockReturnValue(new Promise(() => {}));
    
    const wrapper = mount(NotionTestView, {
      global: {
        stubs: {
          NotionTreeNode: NotionTreeNodeStub
        }
      }
    });

    expect(wrapper.text()).toContain('Loading...');
  });

  it('renders hierarchy when data loads successfully', async () => {
    const mockNodes = [
      { id: '1', title: 'Page 1', type: 'page', children: [] },
      { id: '2', title: 'Page 2', type: 'page', children: [] }
    ];
    (getHierarchy as any).mockResolvedValue(mockNodes);

    const wrapper = mount(NotionTestView, {
      global: {
        stubs: {
          NotionTreeNode: NotionTreeNodeStub
        }
      }
    });

    // Wait for onMounted and promise resolution
    await flushPromises();

    expect(wrapper.text()).not.toContain('Loading...');
    expect(wrapper.find('h1').text()).toBe('Notion Hierarchy');
    
    const nodes = wrapper.findAll('.notion-tree-node-stub');
    expect(nodes).toHaveLength(2);
    expect(nodes[0].text()).toBe('Page 1');
    expect(nodes[1].text()).toBe('Page 2');
  });

  it('renders error message when data fetching fails', async () => {
    const errorMessage = 'Network error';
    (getHierarchy as any).mockRejectedValue(new Error(errorMessage));

    const wrapper = mount(NotionTestView, {
      global: {
        stubs: {
          NotionTreeNode: NotionTreeNodeStub
        }
      }
    });

    await flushPromises();

    expect(wrapper.text()).not.toContain('Loading...');
    expect(wrapper.text()).toContain(`Error: ${errorMessage}`);
    expect(wrapper.findAll('.notion-tree-node-stub')).toHaveLength(0);
  });
});
