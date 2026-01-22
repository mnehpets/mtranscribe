import { ref } from 'vue'
import { useAudioCapture } from './useAudioCapture'
import { Transcript } from '../Transcript'
import type { Transcriber } from '../Transcriber'

const now = new Date()
const currentTranscript = ref(new Transcript(
  'Weekly Sync',
  'Weekly team synchronization meeting to discuss progress and blockers.',
  'Remember to update the Jira board.',
  [
    {
      speaker: 'Alice',
      text: 'Good morning everyone, let\'s start with the updates.',
      timestamp: new Date(now.getTime() - 60000 * 5),
      interim: ''
    },
    {
      speaker: 'Bob',
      text: 'I have finished the user authentication module.',
      timestamp: new Date(now.getTime() - 60000 * 4),
      interim: ''
    },
    {
      speaker: 'Alice',
      text: 'That is great news, Bob. Any blockers?',
      timestamp: new Date(now.getTime() - 60000 * 3),
      interim: ''
    },
    {
      speaker: 'Bob',
      text: 'No blockers at the moment.',
      timestamp: new Date(now.getTime() - 60000 * 2),
      interim: ''
    },
    {
      speaker: 'Charlie',
      text: 'I am working on the frontend integration.',
      timestamp: new Date(now.getTime() - 60000 * 1),
      interim: ''
    },
    {
      speaker: 'Alice',
      text: 'Excellent. Let\'s keep pushing.',
      timestamp: now,
      interim: ''
    }
  ]
))

// Mock factory for now - will be replaced with real implementation
const transcriberFactory = (t: Transcript): Transcriber => ({
  sendAudio: (blob) => {
    // console.log('Sending audio chunk:', blob.size)
  },
  stop: () => {
    console.log('Transcriber stopped')
  }
})

// Initialize singleton with autoCleanup disabled so it persists across navigation
const session = useAudioCapture(transcriberFactory, currentTranscript, { autoCleanup: false })

export function useRecordingSession() {
  return {
    ...session,
    transcript: currentTranscript
  }
}
