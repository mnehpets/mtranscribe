<template>
  <div class="w-full h-8 bg-gray-200 rounded-lg overflow-hidden">
    <div
      class="h-full bg-green-500 transition-all duration-100"
      :style="{ width: `${volume}%` }"
    ></div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps({
  mediaStream: {
    type: Object,
    default: null
  },
  enabled: {
    type: Boolean,
    default: false
  }
})

const volume = ref(0)
let audioContext = null
let analyserNode = null
let mediaStreamSource = null
let animationFrameId = null

const cleanup = () => {
  if (animationFrameId) {
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
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    analyserNode = audioContext.createAnalyser()
    analyserNode.fftSize = 256
    analyserNode.smoothingTimeConstant = 0.8

    mediaStreamSource = audioContext.createMediaStreamSource(props.mediaStream)
    mediaStreamSource.connect(analyserNode)

    const bufferLength = analyserNode.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const updateVolume = () => {
      if (!props.enabled || !analyserNode) {
        return
      }

      analyserNode.getByteFrequencyData(dataArray)

      // Calculate RMS (root mean square) for volume
      let sum = 0
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i]
      }
      const rms = Math.sqrt(sum / bufferLength)

      // Convert to logarithmic scale (dB)
      // RMS is 0-255, normalize and convert to dB
      const normalizedRms = rms / 255
      const db = normalizedRms > 0 ? 20 * Math.log10(normalizedRms) : -100

      // Map dB range (-60 to 0) to percentage (0 to 100)
      const minDb = -60
      const maxDb = 0
      const clampedDb = Math.max(minDb, Math.min(maxDb, db))
      const volumePercent = ((clampedDb - minDb) / (maxDb - minDb)) * 100

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
