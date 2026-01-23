import { describe, it, expect } from 'vitest';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { Transcript } from '../Transcript';

describe('MarkdownRenderer', () => {
  it('renders a full transcript correctly', () => {
    const transcript = new Transcript('My Meeting', 'Summary text', 'Notes text');
    const date = new Date('2023-01-01T10:00:00');
    transcript.addTurn({
      speaker: 'Alice',
      text: 'Hello world',
      timestamp: date,
      interim: '',
      source: 'typed'
    });
    transcript.addTurn({
      speaker: 'Bob',
      text: 'Hi Alice',
      timestamp: new Date('2023-01-01T10:01:00'),
      interim: '',
      source: 'transcribed'
    });

    const renderer = new MarkdownRenderer();
    const result = renderer.render(transcript);

    expect(result).toContain('# My Meeting');
    expect(result).toContain('## Summary\nSummary text');
    expect(result).toContain('## Notes\nNotes text');
    expect(result).toContain('## Transcript');
    
    // Check for speaker and content
    expect(result).toContain('**Alice**');
    expect(result).toContain('Hello world');
    expect(result).toContain('**Bob**');
    expect(result).toContain('Hi Alice');
    
    // Check layout - turns should be separated
    expect(result).toMatch(/\*\*Alice\*\*.*?\nHello world/);
    expect(result).toMatch(/\*\*Bob\*\*.*?\nHi Alice/);

    // Check timestamp format (HH:MM:SS)
    // We search for (dd:dd:dd) where d is digit
    expect(result).toMatch(/\(\d{2}:\d{2}:\d{2}\)/);
  });

  it('omits empty sections', () => {
    const transcript = new Transcript();
    // No title, summary, notes, or turns

    const renderer = new MarkdownRenderer();
    const result = renderer.render(transcript);

    expect(result).toBe('');
  });

  it('renders transcript with only title', () => {
    const transcript = new Transcript('Just Title');
    const renderer = new MarkdownRenderer();
    const result = renderer.render(transcript);

    expect(result).toBe('# Just Title');
    expect(result).not.toContain('## Summary');
    expect(result).not.toContain('## Notes');
    expect(result).not.toContain('## Transcript');
  });

  it('renders transcript with turns but no metadata', () => {
    const transcript = new Transcript();
    transcript.addTurn({
      speaker: 'Alice',
      text: 'Hello',
      timestamp: new Date(),
      interim: '',
      source: 'typed'
    });

    const renderer = new MarkdownRenderer();
    const result = renderer.render(transcript);

    // Should not start with a single hash title
    expect(result).not.toMatch(/^# /);
    expect(result).toContain('## Transcript');
    expect(result).toContain('**Alice**');
  });
});
