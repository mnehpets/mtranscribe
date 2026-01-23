import { describe, it, expect, beforeEach } from 'vitest';
import { Transcript } from '../Transcript';
import type { TurnSource } from '../Transcript';

describe('Transcript', () => {
  let transcript: Transcript;

  beforeEach(() => {
    transcript = new Transcript();
  });

  describe('updateInterim', () => {
    it('creates a new active turn if none exists for the source', () => {
      transcript.updateInterim('Hello', 'transcribed');
      
      // @ts-ignore - accessing private property for testing
      const activeTurn = transcript.activeTurns.get('transcribed');
      expect(activeTurn).toBeDefined();
      expect(activeTurn?.interim).toBe('Hello');
      expect(activeTurn?.text).toBe('');
      expect(activeTurn?.source).toBe('transcribed');
    });

    it('replaces interim text for existing turn', () => {
      transcript.updateInterim('Hello', 'transcribed');
      transcript.updateInterim('Hello world', 'transcribed');
      
      // @ts-ignore - accessing private property for testing
      const activeTurn = transcript.activeTurns.get('transcribed');
      expect(activeTurn?.interim).toBe('Hello world');
    });

    it('maintains separate interim text for different sources', () => {
      transcript.updateInterim('Transcribed text', 'transcribed');
      transcript.updateInterim('Typed text', 'typed');
      
      // @ts-ignore - accessing private property for testing
      expect(transcript.activeTurns.get('transcribed')?.interim).toBe('Transcribed text');
      // @ts-ignore - accessing private property for testing
      expect(transcript.activeTurns.get('typed')?.interim).toBe('Typed text');
    });

    it('sets appropriate speaker based on source', () => {
      transcript.updateInterim('Text', 'transcribed');
      transcript.updateInterim('Text', 'typed');
      
      // @ts-ignore - accessing private property for testing
      expect(transcript.activeTurns.get('transcribed')?.speaker).toBe('Transcription');
      // @ts-ignore - accessing private property for testing
      expect(transcript.activeTurns.get('typed')?.speaker).toBe('User');
    });
  });

  describe('appendStable', () => {
    it('creates a new active turn if none exists', () => {
      transcript.appendStable('Hello', 'transcribed');
      
      // @ts-ignore - accessing private property for testing
      const activeTurn = transcript.activeTurns.get('transcribed');
      expect(activeTurn).toBeDefined();
      expect(activeTurn?.text).toBe('Hello');
      expect(activeTurn?.interim).toBe('');
    });

    it('appends to existing stable text', () => {
      transcript.appendStable('Hello ', 'transcribed');
      transcript.appendStable('world', 'transcribed');
      
      // @ts-ignore - accessing private property for testing
      const activeTurn = transcript.activeTurns.get('transcribed');
      expect(activeTurn?.text).toBe('Hello world');
    });

    it('clears interim text after appending', () => {
      transcript.updateInterim('Interim', 'transcribed');
      transcript.appendStable('Stable', 'transcribed');
      
      // @ts-ignore - accessing private property for testing
      const activeTurn = transcript.activeTurns.get('transcribed');
      expect(activeTurn?.text).toBe('Stable');
      expect(activeTurn?.interim).toBe('');
    });

    it('maintains separate stable text for different sources', () => {
      transcript.appendStable('From transcription', 'transcribed');
      transcript.appendStable('From typing', 'typed');
      
      // @ts-ignore - accessing private property for testing
      expect(transcript.activeTurns.get('transcribed')?.text).toBe('From transcription');
      // @ts-ignore - accessing private property for testing
      expect(transcript.activeTurns.get('typed')?.text).toBe('From typing');
    });
  });

  describe('finalizeTurn', () => {
    it('adds turn to turns array when it has stable text', () => {
      transcript.appendStable('Hello world', 'transcribed');
      transcript.finalizeTurn('transcribed');
      
      expect(transcript.turns).toHaveLength(1);
      expect(transcript.turns[0].text).toBe('Hello world');
      expect(transcript.turns[0].source).toBe('transcribed');
    });

    it('adds turn to turns array when it has interim text', () => {
      transcript.updateInterim('Hello world', 'transcribed');
      transcript.finalizeTurn('transcribed');
      
      expect(transcript.turns).toHaveLength(1);
      expect(transcript.turns[0].text).toBe('Hello world');
    });

    it('merges interim into stable text when finalizing', () => {
      transcript.appendStable('Stable ', 'transcribed');
      transcript.updateInterim('interim', 'transcribed');
      transcript.finalizeTurn('transcribed');
      
      expect(transcript.turns).toHaveLength(1);
      expect(transcript.turns[0].text).toBe('Stable interim');
      expect(transcript.turns[0].interim).toBe('');
    });

    it('removes turn from activeTurns after finalizing', () => {
      transcript.appendStable('Hello', 'transcribed');
      transcript.finalizeTurn('transcribed');
      
      // @ts-ignore - accessing private property for testing
      expect(transcript.activeTurns.has('transcribed')).toBe(false);
    });

    it('does not add empty turns to the array', () => {
      transcript.updateInterim('', 'transcribed');
      transcript.finalizeTurn('transcribed');
      
      expect(transcript.turns).toHaveLength(0);
    });

    it('does not add whitespace-only turns to the array', () => {
      transcript.updateInterim('   ', 'transcribed');
      transcript.finalizeTurn('transcribed');
      
      expect(transcript.turns).toHaveLength(0);
    });

    it('does nothing if no active turn exists for the source', () => {
      transcript.finalizeTurn('transcribed');
      
      expect(transcript.turns).toHaveLength(0);
    });

    it('only finalizes the specified source', () => {
      transcript.appendStable('Transcribed', 'transcribed');
      transcript.appendStable('Typed', 'typed');
      transcript.finalizeTurn('transcribed');
      
      // Both turns should be visible in the list (reactivity)
      expect(transcript.turns).toHaveLength(2);
      expect(transcript.turns[0].source).toBe('transcribed');
      expect(transcript.turns[1].source).toBe('typed');
      
      // But only typed should still be active
      // @ts-ignore - accessing private property for testing
      expect(transcript.activeTurns.has('transcribed')).toBe(false);
      // @ts-ignore - accessing private property for testing
      expect(transcript.activeTurns.has('typed')).toBe(true);
    });
  });

  describe('addTurn', () => {
    it('adds a turn to the turns array', () => {
      const turn = {
        speaker: 'Test',
        text: 'Hello',
        timestamp: new Date(),
        interim: '',
        source: 'typed' as TurnSource
      };
      
      transcript.addTurn(turn);
      
      expect(transcript.turns).toHaveLength(1);
      expect(transcript.turns[0]).toBe(turn);
    });
  });

  describe('integration scenarios', () => {
    it('handles a complete transcription flow', () => {
      // Start with interim results
      transcript.updateInterim('Hello', 'transcribed');
      transcript.updateInterim('Hello there', 'transcribed');
      
      // Get final result
      transcript.appendStable('Hello there ', 'transcribed');
      
      // More interim
      transcript.updateInterim('how', 'transcribed');
      transcript.updateInterim('how are', 'transcribed');
      
      // More final
      transcript.appendStable('how are you ', 'transcribed');
      
      // Utterance end
      transcript.finalizeTurn('transcribed');
      
      expect(transcript.turns).toHaveLength(1);
      expect(transcript.turns[0].text).toBe('Hello there how are you ');
    });

    it('handles multiple parallel sources', () => {
      // Transcription happening
      transcript.updateInterim('Transcribing', 'transcribed');
      
      // User types at the same time
      transcript.appendStable('User note', 'typed');
      
      // Transcription finalizes
      transcript.appendStable('Transcribing ', 'transcribed');
      transcript.finalizeTurn('transcribed');
      
      // User finalizes
      transcript.finalizeTurn('typed');
      
      expect(transcript.turns).toHaveLength(2);
      expect(transcript.turns[0].source).toBe('transcribed');
      expect(transcript.turns[0].text).toBe('Transcribing ');
      expect(transcript.turns[1].source).toBe('typed');
      expect(transcript.turns[1].text).toBe('User note');
    });
  });

  describe('reactivity', () => {
    it('immediately adds turn to turns array on updateInterim', () => {
      transcript.updateInterim('Hello', 'transcribed');
      expect(transcript.turns).toHaveLength(1);
      expect(transcript.turns[0].interim).toBe('Hello');
    });

    it('immediately adds turn to turns array on appendStable', () => {
      transcript.appendStable('Hello', 'transcribed');
      expect(transcript.turns).toHaveLength(1);
      expect(transcript.turns[0].text).toBe('Hello');
    });

    it('does not duplicate turns when finalizing', () => {
      transcript.appendStable('Hello', 'transcribed');
      expect(transcript.turns).toHaveLength(1);
      
      transcript.finalizeTurn('transcribed');
      expect(transcript.turns).toHaveLength(1);
    });

    it('removes turn if it ends up empty on finalize', () => {
      transcript.updateInterim('temp', 'transcribed');
      expect(transcript.turns).toHaveLength(1);
      
      transcript.updateInterim('', 'transcribed'); 
      expect(transcript.turns).toHaveLength(1);
      expect(transcript.turns[0].interim).toBe('');

      transcript.finalizeTurn('transcribed');
      expect(transcript.turns).toHaveLength(0);
    });
  });
});
