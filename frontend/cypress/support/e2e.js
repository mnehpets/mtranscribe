import { LiveTranscriptionEvents } from '@deepgram/sdk'

// Cypress support file for E2E tests
// This file runs before every test

// Mock Deepgram SDK by intercepting the module
Cypress.on('window:before:load', (win) => {
  // Set up API key in localStorage before app loads
  win.localStorage.setItem('mtranscribe-settings', JSON.stringify({
    deepgramApiKey: 'test-api-key-12345'
  }))

  // Create global mock store for Deepgram events
  win.__deepgramMock = {
    connection: null,
    handlers: {},
    triggerTranscript: function(data) {
      if (this.handlers[LiveTranscriptionEvents.Transcript]) {
        this.handlers[LiveTranscriptionEvents.Transcript](data)
      }
    },
    triggerUtteranceEnd: function() {
      if (this.handlers[LiveTranscriptionEvents.UtteranceEnd]) {
        this.handlers[LiveTranscriptionEvents.UtteranceEnd]()
      }
    },
    triggerError: function(error) {
      if (this.handlers[LiveTranscriptionEvents.Error]) {
        this.handlers[LiveTranscriptionEvents.Error](error)
      }
    },
    triggerOpen: function() {
      if (this.handlers[LiveTranscriptionEvents.Open]) {
        this.handlers[LiveTranscriptionEvents.Open]()
      }
    },
    triggerClose: function() {
      if (this.handlers[LiveTranscriptionEvents.Close]) {
        this.handlers[LiveTranscriptionEvents.Close]()
      }
    }
  }

  // Mock MediaRecorder
  win.MediaRecorder = class MockMediaRecorder {
    constructor(stream, options) {
      this.stream = stream
      this.options = options
      this.state = 'inactive'
      this.ondataavailable = null
      this.onstop = null
      this.onstart = null
      this.onpause = null
      this.onresume = null
      this.onerror = null
    }

    start(timeslice) {
      this.state = 'recording'
      if (this.onstart) this.onstart()
      
      // Simulate periodic data available events
      this._interval = setInterval(() => {
        if (this.state === 'recording' && this.ondataavailable) {
          const blob = new Blob(['fake audio data'], { type: 'audio/webm' })
          this.ondataavailable({ data: blob })
        }
      }, timeslice || 250)
    }

    stop() {
      this.state = 'inactive'
      if (this._interval) {
        clearInterval(this._interval)
        this._interval = null
      }
      if (this.onstop) this.onstop()
    }

    pause() {
      this.state = 'paused'
      if (this.onpause) this.onpause()
    }

    resume() {
      this.state = 'recording'
      if (this.onresume) this.onresume()
    }
  }

  win.MediaRecorder.isTypeSupported = (type) => {
    return ['audio/webm', 'audio/webm;codecs=opus', 'audio/ogg', 'audio/ogg;codecs=opus'].includes(type)
  }

  // Mock navigator.mediaDevices
  if (!win.navigator.mediaDevices) {
    win.navigator.mediaDevices = {}
  }
  
  win.navigator.mediaDevices.getUserMedia = (constraints) => {
    const mockTrack = {
      stop: () => {},
      enabled: true,
      kind: 'audio',
      label: 'Mock Microphone'
    }
    
    return Promise.resolve({
      getTracks: () => [mockTrack],
      getAudioTracks: () => [mockTrack],
      active: true,
      id: 'mock-stream-id'
    })
  }

  win.navigator.mediaDevices.enumerateDevices = () => {
    return Promise.resolve([
      { kind: 'audioinput', deviceId: 'default', label: 'Mock Microphone' }
    ])
  }

  // Mock the Deepgram SDK module
  // We'll intercept the import by modifying the module cache
  const createMockClient = (apiKey) => ({
    listen: {
      live: (options) => {
        const connection = {
          send: (data) => {
            // Simulate receiving transcription results after sending audio
            // In real tests, we'll manually trigger these
          },
          requestClose: () => {
            if (win.__deepgramMock.handlers[LiveTranscriptionEvents.Close]) {
              win.__deepgramMock.handlers[LiveTranscriptionEvents.Close]()
            }
          },
          on: (event, handler) => {
            win.__deepgramMock.handlers[event] = handler
          }
        }
        
        win.__deepgramMock.connection = connection
        
        // Auto-trigger Open event after a short delay to simulate connection
        setTimeout(() => {
          if (win.__deepgramMock.handlers[LiveTranscriptionEvents.Open]) {
            win.__deepgramMock.handlers[LiveTranscriptionEvents.Open]()
          }
        }, 100)
        
        return connection
      }
    }
  })

  // Store mocks on window for the app to potentially use
  win.__deepgramSdkMock = {
    createClient: createMockClient,
    LiveTranscriptionEvents
  }
})

// Clean up after each test
Cypress.on('test:after:run', () => {
  // Any cleanup needed
})
