# Add VuMeter Component

## Summary
Add a Vue 3 component `VuMeter` that visualizes the volume level of a given MediaStream.

## Motivation
Users need visual feedback to confirm that their microphone is working and to monitor the input level.

## Solution
Create a `VuMeter` component that:
- Accepts `mediaStream` (MediaStream) and `enabled` (boolean) props.
- Uses the Web Audio API (`AudioContext`, `MediaStreamSource`, `AnalyserNode`) to analyze audio data.
- Calculates the volume on a logarithmic scale.
- Renders a horizontal green bar using Tailwind CSS to represent the volume level.
- Updates the visualization periodically using `requestAnimationFrame`.
