import { Transcript, Turn } from './Transcript';

export class MarkdownRenderer {
  render(transcript: Transcript): string {
    const parts: string[] = [];

    if (transcript.title) {
      parts.push(`# ${transcript.title}`);
    }

    if (transcript.summary) {
      parts.push(`## Summary\n${transcript.summary}`);
    }

    if (transcript.notes) {
      parts.push(`## Notes\n${transcript.notes}`);
    }

    if (transcript.turns.length > 0) {
      parts.push('## Transcript');
      const turnsText = transcript.turns.map(this.renderTurn).join('\n\n');
      parts.push(turnsText);
    }

    return parts.join('\n\n');
  }

  private renderTurn(turn: Turn): string {
    const timeString = turn.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const text = turn.text || turn.interim || ''; 
    return `**${turn.speaker}** (${timeString})\n${text}`;
  }
}
