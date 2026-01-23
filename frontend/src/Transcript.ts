export type TurnSource = 'transcribed' | 'typed' | 'generated';

export interface Turn {
  speaker: string;
  text: string;
  timestamp: Date;
  interim: string;
  source?: TurnSource;
}

export class Transcript {
  title: string;
  summary: string;
  notes: string;
  turns: Turn[];
  private activeTurns: Map<TurnSource, Turn>;

  constructor(title: string = '', summary: string = '', notes: string = '', turns: Turn[] = []) {
    this.title = title;
    this.summary = summary;
    this.notes = notes;
    this.turns = turns;
    this.activeTurns = new Map();
  }

  addTurn(turn: Turn): void {
    this.turns.push(turn);
  }

  /**
   * Updates the interim text for a specific source.
   * Creates a new turn if one doesn't exist for this source.
   * Replaces the interim field with the new text.
   */
  updateInterim(text: string, source: TurnSource): void {
    let turn = this.activeTurns.get(source);
    if (!turn) {
      turn = {
        speaker: source === 'transcribed' ? 'Transcription' : 'User',
        text: '',
        timestamp: new Date(),
        interim: '',
        source
      };
      this.activeTurns.set(source, turn);
    }
    turn.interim = text;
  }

  /**
   * Appends text to the stable text field for a specific source.
   * Creates a new turn if one doesn't exist for this source.
   * Clears the interim field after appending.
   */
  appendStable(text: string, source: TurnSource): void {
    let turn = this.activeTurns.get(source);
    if (!turn) {
      turn = {
        speaker: source === 'transcribed' ? 'Transcription' : 'User',
        text: '',
        timestamp: new Date(),
        interim: '',
        source
      };
      this.activeTurns.set(source, turn);
    }
    turn.text += text;
    turn.interim = '';
  }

  /**
   * Finalizes the active turn for a specific source.
   * Moves it to the turns array and removes it from activeTurns.
   */
  finalizeTurn(source: TurnSource): void {
    const turn = this.activeTurns.get(source);
    if (turn) {
      // Only add to turns if there's actual content
      if (turn.text.trim() || turn.interim.trim()) {
        // Merge any remaining interim into stable text
        if (turn.interim.trim()) {
          turn.text += turn.interim;
          turn.interim = '';
        }
        this.turns.push(turn);
      }
      this.activeTurns.delete(source);
    }
  }
}
