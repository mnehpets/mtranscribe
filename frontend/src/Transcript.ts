export interface Turn {
  speaker: string;
  text: string;
  timestamp: Date;
  interim: string;
}

export class Transcript {
  title: string;
  summary: string;
  notes: string;
  turns: Turn[];

  constructor(title: string = '', summary: string = '', notes: string = '', turns: Turn[] = []) {
    this.title = title;
    this.summary = summary;
    this.notes = notes;
    this.turns = turns;
  }

  addTurn(turn: Turn): void {
    this.turns.push(turn);
  }
}
