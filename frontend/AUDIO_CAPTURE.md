# AudioCaptureController Usage

## Overview

The `AudioCaptureController` manages microphone access, audio capture state, and routes audio data to the transcription service.

## Basic Usage

```typescript
import { ref } from 'vue'
import { useAudioCapture } from './composables/useAudioCapture'
import { Transcript } from './Transcript'
import type { Transcriber } from './Transcriber'

// Create a mock transcriber factory (replace with actual implementation)
const transcriberFactory = (transcript: Transcript): Transcriber => ({
  sendAudio(blob: Blob) {
    console.log('Received audio blob:', blob.size, 'bytes')
    // Send to backend for transcription
  },
  stop() {
    console.log('Transcriber stopped')
  }
})

// In your component
const transcript = ref(new Transcript('My Meeting'))
const { state, stream, error, start, stop, mute, unmute, setTranscript } = 
  useAudioCapture(transcriberFactory, transcript)

// Start capturing
await start()

// Mute audio transmission (stream stays active for VuMeter)
mute()

// Resume audio transmission
unmute()

// Stop capturing
stop()

// Switch to a different transcript
const newTranscript = new Transcript('New Meeting')
setTranscript(newTranscript)
```

## Integration with VuMeter

```vue
<template>
  <div>
    <button @click="toggleCapture">
      {{ isCapturing ? 'Stop' : 'Start' }} Recording
    </button>
    
    <VuMeter 
      :mediaStream="stream" 
      :enabled="state === 'capturing' || state === 'muted'" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import VuMeter from './components/VuMeter.vue'
import { useAudioCapture } from './composables/useAudioCapture'
import { Transcript } from './Transcript'

const transcript = ref(new Transcript('My Meeting'))
const transcriberFactory = () => ({ sendAudio() {}, stop() {} })

const { state, stream, start, stop } = useAudioCapture(transcriberFactory, transcript)

const isCapturing = computed(() => state.value !== 'idle')

async function toggleCapture() {
  if (isCapturing.value) {
    stop()
  } else {
    await start()
  }
}
</script>
```

## States

- `idle`: Not capturing, no microphone access
- `capturing`: Actively capturing and sending audio to transcriber
- `muted`: Microphone stream active (for VuMeter) but not sending audio to transcriber

## Error Handling

```typescript
const { start, error } = useAudioCapture(transcriberFactory, transcript)

try {
  await start()
} catch (err) {
  console.error('Failed to start capture:', error.value)
  // Handle microphone permission denied, etc.
}
```

## Supported Audio Formats

The controller automatically selects the best supported audio format:
1. `audio/webm;codecs=opus` (preferred)
2. `audio/webm`
3. `audio/ogg;codecs=opus`
4. `audio/ogg`
5. `audio/mp4`
6. `audio/wav`
7. Browser default (if none of the above are supported)
