import type { Transcript, Turn } from './Transcript';
import type { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';

/**
 * Converts a Transcript object to an array of Notion Block objects.
 * 
 * The conversion follows this structure:
 * - Title is handled separately (as page title)
 * - Summary section (if present)
 * - Notes section (if present)
 * - Transcript section with each turn formatted as:
 *   - Heading 3 for speaker name with timestamp
 *   - Paragraph for the turn text
 * 
 * @param transcript The transcript to convert
 * @returns Array of Notion block objects
 */
export function transcriptToNotionBlocks(transcript: Transcript): BlockObjectRequest[] {
  const blocks: BlockObjectRequest[] = [];

  // Add summary section if present
  if (transcript.summary && transcript.summary.trim()) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Summary' } }]
      }
    });
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: transcript.summary } }]
      }
    });
  }

  // Add notes section if present
  if (transcript.notes && transcript.notes.trim()) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Notes' } }]
      }
    });
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: transcript.notes } }]
      }
    });
  }

  // Add transcript section
  if (transcript.turns.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Transcript' } }]
      }
    });

    // Add each turn
    for (const turn of transcript.turns) {
      // Skip turns with no content
      const content = turn.text + turn.interim;
      if (!content.trim()) continue;

      // Format timestamp
      const timestamp = turn.timestamp.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Add speaker heading with timestamp
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [
            { type: 'text', text: { content: turn.speaker } },
            { type: 'text', text: { content: ` (${timestamp})` }, annotations: { color: 'gray' } }
          ]
        }
      });

      // Add turn text
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: content.trim() } }]
        }
      });
    }
  }

  return blocks;
}

/**
 * Splits blocks into chunks to respect Notion's API limits.
 * Notion allows a maximum of 100 blocks per request.
 * 
 * @param blocks Array of blocks to split
 * @param chunkSize Maximum number of blocks per chunk (default: 100)
 * @returns Array of block chunks
 */
export function chunkBlocks(blocks: BlockObjectRequest[], chunkSize: number = 100): BlockObjectRequest[][] {
  const chunks: BlockObjectRequest[][] = [];
  for (let i = 0; i < blocks.length; i += chunkSize) {
    chunks.push(blocks.slice(i, i + chunkSize));
  }
  return chunks;
}
