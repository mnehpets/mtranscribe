import { describe, it, expect } from 'vitest';
import { transcriptToNotionBlocks, chunkBlocks } from '../notionUtils';
import { Transcript } from '../Transcript';

describe('notionUtils', () => {
  describe('transcriptToNotionBlocks', () => {
    it('converts transcript with summary and notes', () => {
      const transcript = new Transcript(
        'Test Title',
        'This is a summary',
        'These are notes',
        []
      );

      const blocks = transcriptToNotionBlocks(transcript);

      expect(blocks).toHaveLength(4); // 2 headings + 2 paragraphs
      expect(blocks[0]).toMatchObject({
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Summary' } }]
        }
      });
      expect(blocks[1]).toMatchObject({
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: 'This is a summary' } }]
        }
      });
      expect(blocks[2]).toMatchObject({
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Notes' } }]
        }
      });
      expect(blocks[3]).toMatchObject({
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: 'These are notes' } }]
        }
      });
    });

    it('converts transcript with turns', () => {
      const transcript = new Transcript('Test', '', '', [
        {
          speaker: 'Alice',
          text: 'Hello world',
          timestamp: new Date('2024-01-01T10:00:00'),
          interim: '',
          source: 'transcribed'
        },
        {
          speaker: 'Bob',
          text: 'Hi there',
          timestamp: new Date('2024-01-01T10:00:05'),
          interim: '',
          source: 'transcribed'
        }
      ]);

      const blocks = transcriptToNotionBlocks(transcript);

      // Should have: 1 "Transcript" heading + 2 turns * 2 blocks each (heading + paragraph)
      expect(blocks).toHaveLength(5);
      expect(blocks[0]).toMatchObject({
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Transcript' } }]
        }
      });

      // First turn
      expect(blocks[1]).toMatchObject({
        type: 'heading_3',
        heading_3: {
          rich_text: expect.arrayContaining([
            { type: 'text', text: { content: 'Alice' } }
          ])
        }
      });
      expect(blocks[2]).toMatchObject({
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: 'Hello world' } }]
        }
      });

      // Second turn
      expect(blocks[3]).toMatchObject({
        type: 'heading_3',
        heading_3: {
          rich_text: expect.arrayContaining([
            { type: 'text', text: { content: 'Bob' } }
          ])
        }
      });
      expect(blocks[4]).toMatchObject({
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: 'Hi there' } }]
        }
      });
    });

    it('skips empty turns', () => {
      const transcript = new Transcript('Test', '', '', [
        {
          speaker: 'Alice',
          text: '',
          timestamp: new Date(),
          interim: '',
          source: 'transcribed'
        },
        {
          speaker: 'Bob',
          text: 'Valid content',
          timestamp: new Date(),
          interim: '',
          source: 'transcribed'
        }
      ]);

      const blocks = transcriptToNotionBlocks(transcript);

      // Should only have the transcript heading + Bob's turn (2 blocks)
      expect(blocks).toHaveLength(3);
    });

    it('includes interim text in turn content', () => {
      const transcript = new Transcript('Test', '', '', [
        {
          speaker: 'Alice',
          text: 'Stable ',
          timestamp: new Date(),
          interim: 'interim text',
          source: 'transcribed'
        }
      ]);

      const blocks = transcriptToNotionBlocks(transcript);

      expect(blocks[2]).toMatchObject({
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: 'Stable interim text' } }]
        }
      });
    });

    it('handles empty transcript', () => {
      const transcript = new Transcript('', '', '', []);
      const blocks = transcriptToNotionBlocks(transcript);
      expect(blocks).toHaveLength(0);
    });
  });

  describe('chunkBlocks', () => {
    it('splits blocks into chunks of 100', () => {
      const blocks = Array.from({ length: 250 }, (_, i) => ({
        object: 'block' as const,
        type: 'paragraph' as const,
        paragraph: {
          rich_text: [{ type: 'text' as const, text: { content: `Block ${i}` } }]
        }
      }));

      const chunks = chunkBlocks(blocks);

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toHaveLength(100);
      expect(chunks[1]).toHaveLength(100);
      expect(chunks[2]).toHaveLength(50);
    });

    it('handles blocks less than chunk size', () => {
      const blocks = Array.from({ length: 50 }, (_, i) => ({
        object: 'block' as const,
        type: 'paragraph' as const,
        paragraph: {
          rich_text: [{ type: 'text' as const, text: { content: `Block ${i}` } }]
        }
      }));

      const chunks = chunkBlocks(blocks);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toHaveLength(50);
    });

    it('uses custom chunk size', () => {
      const blocks = Array.from({ length: 250 }, (_, i) => ({
        object: 'block' as const,
        type: 'paragraph' as const,
        paragraph: {
          rich_text: [{ type: 'text' as const, text: { content: `Block ${i}` } }]
        }
      }));

      const chunks = chunkBlocks(blocks, 50);

      expect(chunks).toHaveLength(5);
      expect(chunks[0]).toHaveLength(50);
      expect(chunks[4]).toHaveLength(50);
    });

    it('handles empty array', () => {
      const chunks = chunkBlocks([]);
      expect(chunks).toHaveLength(0);
    });
  });
});
