import type { Transcriber, TranscriberFactory } from './Transcriber'
import type { Transcript } from './Transcript'

const TIME_SLICE_MS = 250

export type CaptureState = 'idle' | 'capturing' | 'muted'

export class AudioCaptureController {
  private _state: CaptureState = 'idle'
  private _stream: MediaStream | null = null
  private _transcriber: Transcriber | null = null
  private _transcript: Transcript
  private _transcriberFactory: TranscriberFactory
  private _mediaRecorder: MediaRecorder | null = null

  constructor(transcriberFactory: TranscriberFactory, transcript: Transcript) {
    this._transcriberFactory = transcriberFactory
    this._transcript = transcript
  }

  get state(): CaptureState {
    return this._state
  }

  get stream(): MediaStream | null {
    return this._stream
  }

  async start(): Promise<void> {
    if (this._state !== 'idle') {
      return
    }

    try {
      // Request microphone access
      this._stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Create transcriber instance
      this._transcriber = this._transcriberFactory(this._transcript)

      // Set up MediaRecorder to capture audio
      const mimeType = this._getSupportedMimeType()
      this._mediaRecorder = new MediaRecorder(this._stream, { mimeType })

      this._mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this._state === 'capturing' && this._transcriber) {
          this._transcriber.sendAudio(event.data)
        }
      }

      // Start recording with defined timeslices
      this._mediaRecorder.start(TIME_SLICE_MS)
      this._state = 'capturing'
    } catch (error) {
      // Clean up on error
      this._cleanup()
      throw error
    }
  }

  stop(): void {
    if (this._state === 'idle') {
      return
    }

    this._cleanup()
    this._state = 'idle'
  }

  mute(): void {
    if (this._state !== 'capturing') {
      return
    }

    this._state = 'muted'
    if (this._stream) {
      this._stream.getAudioTracks().forEach(track => { track.enabled = false })
    }
  }

  unmute(): void {
    if (this._state !== 'muted') {
      return
    }

    this._state = 'capturing'
    if (this._stream) {
      this._stream.getAudioTracks().forEach(track => { track.enabled = true })
    }
  }

  setTranscript(transcript: Transcript): void {
    // If currently capturing, stop first
    if (this._state !== 'idle') {
      this.stop()
    }

    // Stop existing transcriber if any
    if (this._transcriber) {
      this._transcriber.stop()
      this._transcriber = null
    }

    // Update transcript reference
    this._transcript = transcript

    // Create new transcriber for the new transcript
    this._transcriber = this._transcriberFactory(this._transcript)
  }

  private _cleanup(): void {
    // Stop media recorder
    if (this._mediaRecorder && this._mediaRecorder.state !== 'inactive') {
      this._mediaRecorder.stop()
    }
    this._mediaRecorder = null

    // Stop transcriber
    if (this._transcriber) {
      this._transcriber.stop()
      this._transcriber = null
    }

    // Stop all media stream tracks
    if (this._stream) {
      this._stream.getTracks().forEach(track => track.stop())
      this._stream = null
    }
  }

  private _getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/wav'
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    // Return empty string if none supported (browser will use default)
    return ''
  }
}
