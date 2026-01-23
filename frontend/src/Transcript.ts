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
  updateInterim(text: string, source: TurnSource, speaker?: string): void {
    let turn = this.activeTurns.get(source);

    if (turn && speaker && turn.speaker !== speaker) {
      if (turn.text.length > 0) {
        this.finalizeTurn(source);
        turn = undefined;
      } else {
        turn.speaker = speaker;
      }
    }

    if (!turn) {
      turn = {
        speaker: speaker || (source === 'transcribed' ? 'Transcription' : 'User'),
        text: '',
        timestamp: new Date(),
        interim: '',
        source
      };
      this.activeTurns.set(source, turn);
      // Ensure the turn is added to the list immediately for reactivity
      this.turns.push(turn);
    }
    turn.interim = text;
  }

  /**
   * Appends text to the stable text field for a specific source.
   * Creates a new turn if one doesn't exist for this source.
   * Clears the interim field after appending.
   */
  appendStable(text: string, source: TurnSource, speaker?: string): void {
    let turn = this.activeTurns.get(source);

    if (turn && speaker && turn.speaker !== speaker) {
      this.finalizeTurn(source);
      turn = undefined;
    }

    if (!turn) {
      turn = {
        speaker: speaker || (source === 'transcribed' ? 'Transcription' : 'User'),
        text: '',
        timestamp: new Date(),
        interim: '',
        source
      };
      this.activeTurns.set(source, turn);
      // Ensure the turn is added to the list immediately for reactivity
      this.turns.push(turn);
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
        // Turn is already in this.turns list if it was created via updateInterim/appendStable
        // but we need to make sure we don't double-add if logic changes
      } else {
        // If turn ended up empty, remove it from list
        const index = this.turns.indexOf(turn);
        if (index !== -1) {
          this.turns.splice(index, 1);
        }
      }
      this.activeTurns.delete(source);
    }
  }
}
