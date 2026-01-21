export type TurnSource = 'transcribed' | 'typed' | 'generated';

export interface Turn {
  speaker: string;
  text: string;
  timestamp: Date;
  interim: string;
  source: TurnSource;
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
   * Gets or creates an active turn for the specified source.
   */
  private getOrCreateActiveTurn(source: TurnSource): Turn {
    let turn = this.activeTurns.get(source);
    if (!turn) {
      turn = {
        speaker: '',
        text: '',
        timestamp: new Date(),
        interim: '',
        source
      };
      this.activeTurns.set(source, turn);
      this.turns.push(turn);
    }
    return turn;
  }

  /**
   * Updates the interim text for a turn from a specific source.
   * Replaces the entire interim text.
   */
  updateInterim(text: string, source: TurnSource): void {
    const turn = this.getOrCreateActiveTurn(source);
    turn.interim = text;
  }

  /**
   * Appends to the interim text for a turn from a specific source.
   */
  appendInterim(delta: string, source: TurnSource): void {
    const turn = this.getOrCreateActiveTurn(source);
    turn.interim += delta;
  }

  /**
   * Appends to the stable text for a turn from a specific source and clears interim.
   */
  appendStable(text: string, source: TurnSource): void {
    const turn = this.getOrCreateActiveTurn(source);
    turn.text += text;
    turn.interim = '';
  }

  /**
   * Finalizes the turn for a specific source.
   */
  finalizeTurn(source: TurnSource): void {
    const turn = this.activeTurns.get(source);
    if (turn) {
      // If there's interim text, append it to stable text
      if (turn.interim) {
        turn.text += turn.interim;
        turn.interim = '';
      }
      this.activeTurns.delete(source);
    }
  }
}
