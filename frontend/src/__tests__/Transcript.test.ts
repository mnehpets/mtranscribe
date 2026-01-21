import { describe, it, expect, beforeEach } from 'vitest'
import { Transcript, TurnSource } from '../Transcript'

describe('Transcript', () => {
  let transcript: Transcript

  beforeEach(() => {
    transcript = new Transcript()
  })

  describe('updateInterim', () => {
    it('creates a new turn if none exists for the source', () => {
      transcript.updateInterim('hello', 'transcribed')
      expect(transcript.turns.length).toBe(1)
      expect(transcript.turns[0].interim).toBe('hello')
      expect(transcript.turns[0].source).toBe('transcribed')
    })

    it('replaces interim text for existing turn', () => {
      transcript.updateInterim('hello', 'transcribed')
      transcript.updateInterim('hello world', 'transcribed')
      expect(transcript.turns.length).toBe(1)
      expect(transcript.turns[0].interim).toBe('hello world')
    })

    it('supports multiple sources independently', () => {
      transcript.updateInterim('spoken text', 'transcribed')
      transcript.updateInterim('typed note', 'typed')
      expect(transcript.turns.length).toBe(2)
      expect(transcript.turns[0].interim).toBe('spoken text')
      expect(transcript.turns[0].source).toBe('transcribed')
      expect(transcript.turns[1].interim).toBe('typed note')
      expect(transcript.turns[1].source).toBe('typed')
    })
  })

  describe('appendInterim', () => {
    it('creates a new turn if none exists for the source', () => {
      transcript.appendInterim('hello', 'generated')
      expect(transcript.turns.length).toBe(1)
      expect(transcript.turns[0].interim).toBe('hello')
    })

    it('appends to existing interim text', () => {
      transcript.appendInterim('hello', 'generated')
      transcript.appendInterim(' world', 'generated')
      expect(transcript.turns.length).toBe(1)
      expect(transcript.turns[0].interim).toBe('hello world')
    })
  })

  describe('appendStable', () => {
    it('creates a new turn if none exists for the source', () => {
      transcript.appendStable('stable text', 'transcribed')
      expect(transcript.turns.length).toBe(1)
      expect(transcript.turns[0].text).toBe('stable text')
      expect(transcript.turns[0].interim).toBe('')
    })

    it('appends to stable text and clears interim', () => {
      transcript.updateInterim('interim', 'transcribed')
      transcript.appendStable('stable.', 'transcribed')
      expect(transcript.turns[0].text).toBe('stable.')
      expect(transcript.turns[0].interim).toBe('')
    })

    it('appends multiple stable fragments', () => {
      transcript.appendStable('Hello ', 'transcribed')
      transcript.appendStable('world.', 'transcribed')
      expect(transcript.turns[0].text).toBe('Hello world.')
    })
  })

  describe('finalizeTurn', () => {
    it('removes the turn from active turns', () => {
      transcript.updateInterim('test', 'transcribed')
      transcript.finalizeTurn('transcribed')
      // After finalization, updating should create a new turn
      transcript.updateInterim('new turn', 'transcribed')
      expect(transcript.turns.length).toBe(2)
    })

    it('appends interim to stable text before finalizing', () => {
      transcript.appendStable('stable ', 'typed')
      transcript.updateInterim('interim', 'typed')
      transcript.finalizeTurn('typed')
      expect(transcript.turns[0].text).toBe('stable interim')
      expect(transcript.turns[0].interim).toBe('')
    })

    it('does nothing if source has no active turn', () => {
      expect(() => transcript.finalizeTurn('transcribed')).not.toThrow()
      expect(transcript.turns.length).toBe(0)
    })

    it('only finalizes the specified source', () => {
      transcript.updateInterim('transcribed text', 'transcribed')
      transcript.updateInterim('typed text', 'typed')
      transcript.finalizeTurn('transcribed')
      
      // Transcribed should create new turn
      transcript.updateInterim('new transcribed', 'transcribed')
      // Typed should update existing
      transcript.updateInterim('updated typed', 'typed')
      
      expect(transcript.turns.length).toBe(3)
      expect(transcript.turns[1].interim).toBe('updated typed')
      expect(transcript.turns[2].interim).toBe('new transcribed')
    })
  })

  describe('concurrent source updates', () => {
    it('handles parallel typing and transcription', () => {
      transcript.updateInterim('Hello', 'transcribed')
      transcript.updateInterim('Note', 'typed')
      
      expect(transcript.turns.length).toBe(2)
      expect(transcript.turns[0].interim).toBe('Hello')
      expect(transcript.turns[0].source).toBe('transcribed')
      expect(transcript.turns[1].interim).toBe('Note')
      expect(transcript.turns[1].source).toBe('typed')
    })

    it('updates sources independently', () => {
      transcript.updateInterim('Hello', 'transcribed')
      transcript.updateInterim('Note', 'typed')
      
      transcript.updateInterim('Hello world', 'transcribed')
      transcript.appendInterim(' book', 'typed')
      
      expect(transcript.turns[0].interim).toBe('Hello world')
      expect(transcript.turns[1].interim).toBe('Note book')
    })
  })

  describe('turn source attribution', () => {
    it('sets source to transcribed', () => {
      transcript.updateInterim('test', 'transcribed')
      expect(transcript.turns[0].source).toBe('transcribed')
    })

    it('sets source to typed', () => {
      transcript.updateInterim('test', 'typed')
      expect(transcript.turns[0].source).toBe('typed')
    })

    it('sets source to generated', () => {
      transcript.updateInterim('test', 'generated')
      expect(transcript.turns[0].source).toBe('generated')
    })
  })
})
