import { ref, type Ref } from 'vue'
import { AudioCaptureController, type CaptureState } from '../AudioCaptureController'
import type { TranscriberFactory } from '../Transcriber'
import type { Transcript } from '../Transcript'

export function useAudioCapture(
  transcriberFactory: TranscriberFactory,
  transcript: Ref<Transcript>
) {
  // Note: The controller captures the initial transcript value. To switch transcripts,
  // explicitly call setTranscript() rather than relying on reactive updates.
  // This ensures proper cleanup of the previous transcriber and capture session.
  const controller = new AudioCaptureController(transcriberFactory, transcript.value)
  
  const state = ref<CaptureState>(controller.state)
  const stream = ref<MediaStream | null>(controller.stream)
  const error = ref<Error | null>(null)

  const start = async () => {
    try {
      error.value = null
      await controller.start()
      state.value = controller.state
      stream.value = controller.stream
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      throw err
    }
  }

  const stop = () => {
    controller.stop()
    state.value = controller.state
    stream.value = controller.stream
  }

  const mute = () => {
    controller.mute()
    state.value = controller.state
  }

  const unmute = () => {
    controller.unmute()
    state.value = controller.state
  }

  const setTranscript = (newTranscript: Transcript) => {
    controller.setTranscript(newTranscript)
    transcript.value = newTranscript
    state.value = controller.state
    stream.value = controller.stream
  }

  return {
    state,
    stream,
    error,
    start,
    stop,
    mute,
    unmute,
    setTranscript
  }
}
