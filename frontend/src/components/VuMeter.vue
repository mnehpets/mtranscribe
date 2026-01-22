<template>
  <div class="w-full bg-gray-200 rounded overflow-hidden">
    <div
      class="h-full bg-green-500 transition-all duration-100"
      :style="{ width: `${volume}%` }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

interface Props {
  mediaStream?: MediaStream | null
  enabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mediaStream: null,
  enabled: false
})

const volume = ref<number>(0)
let audioContext: AudioContext | null = null
let analyserNode: AnalyserNode | null = null
let mediaStreamSource: MediaStreamAudioSourceNode | null = null
let animationFrameId: number | null = null

const SILENT_DB_LEVEL = -100
const MIN_DB = -50
const MAX_DB = -6

const cleanup = () => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  
  if (mediaStreamSource) {
    mediaStreamSource.disconnect()
    mediaStreamSource = null
  }
  
  if (analyserNode) {
    analyserNode.disconnect()
    analyserNode = null
  }
  
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close()
    audioContext = null
  }
  
  volume.value = 0
}

const startAudioProcessing = () => {
  if (!props.mediaStream || !props.enabled) {
    return
  }

  cleanup()

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    audioContext = new AudioContextClass()
    analyserNode = audioContext.createAnalyser()
    analyserNode.fftSize = 64
    analyserNode.smoothingTimeConstant = 0.8

    mediaStreamSource = audioContext.createMediaStreamSource(props.mediaStream)
    mediaStreamSource.connect(analyserNode)

    const bufferLength = analyserNode.fftSize
    const dataArray = new Uint8Array(bufferLength)

    const updateVolume = () => {
      if (!props.enabled || !analyserNode) {
        cleanup()
        return
      }

      analyserNode.getByteTimeDomainData(dataArray)

      // Calculate RMS (root mean square) for volume in time domain
      let sum = 0
      for (let i = 0; i < bufferLength; i++) {
        // Convert from unsigned byte (0-255) to signed amplitude (-1 to 1)
        const amplitude = (dataArray[i] - 128) / 128
        sum += amplitude * amplitude
      }
      const rms = Math.sqrt(sum / bufferLength)

      // Convert to dB scale
      const db = rms > 0 ? 20 * Math.log10(rms) : SILENT_DB_LEVEL

      // Map dB range (-50 to 0) to percentage (0 to 100)
      const clampedDb = Math.max(MIN_DB, Math.min(MAX_DB, db))
      const volumePercent = ((clampedDb - MIN_DB) / (MAX_DB - MIN_DB)) * 100

      volume.value = volumePercent

      animationFrameId = requestAnimationFrame(updateVolume)
    }

    updateVolume()
  } catch (error) {
    console.error('Error setting up audio processing:', error)
    cleanup()
  }
}

watch(
  () => [props.mediaStream, props.enabled],
  () => {
    if (props.enabled && props.mediaStream) {
      startAudioProcessing()
    } else {
      cleanup()
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  cleanup()
})
</script>
