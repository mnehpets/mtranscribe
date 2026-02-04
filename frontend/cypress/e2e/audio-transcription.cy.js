describe('Audio Transcription E2E', () => {
  beforeEach(() => {
    // Support file (cypress/support/e2e.js) handles all mocking:
    // - Mock MediaRecorder
    // - Mock navigator.mediaDevices.getUserMedia
    // - Mock Deepgram SDK
    // - Set up API key in localStorage
    
    // Visit the capture page (route is /u/ not /u/capture)
    cy.visit('/u/')
  })

  it('should start recording and display REC status', () => {
    // Verify initial idle state
    cy.contains('IDLE').should('be.visible')

    // Click the record button (microphone icon)
    cy.get('button[title="Start Recording"]').click()

    // Wait a moment for recording to start
    cy.wait(500)

    // Verify REC status is displayed
    cy.contains('REC').should('be.visible')
    cy.get('.animate-pulse').should('exist')
  })

  it('should pause and resume recording', () => {
    // Start recording
    cy.get('button[title="Start Recording"]').click()
    cy.wait(500)
    cy.contains('REC').should('be.visible')

    // Click pause button
    cy.get('button[title="Pause Recording"]').click()
    cy.wait(200)
    
    // Verify PAUSED status
    cy.contains('PAUSED').should('be.visible')

    // Click resume button (play icon when paused)
    cy.get('button[title="Resume Recording"]').click()
    cy.wait(200)

    // Verify back to REC status
    cy.contains('REC').should('be.visible')
  })

  it('should stop recording and return to IDLE state', () => {
    // Start recording
    cy.get('button[title="Start Recording"]').click()
    cy.wait(500)
    cy.contains('REC').should('be.visible')

    // Click stop button
    cy.get('button[title="Stop Recording"]').click()
    cy.wait(200)

    // Verify IDLE state
    cy.contains('IDLE').should('be.visible')
  })

  it('should display interim transcription results', () => {
    // Start recording
    cy.get('button[title="Start Recording"]').click()
    cy.wait(1000) // Wait for connection to establish

    // Trigger interim transcription result via window mock
    cy.window().then((win) => {
      if (win.__deepgramMock?.triggerTranscript) {
        win.__deepgramMock.triggerTranscript({
          channel: {
            alternatives: [{
              transcript: 'Hello world',
              words: [
                { word: 'Hello', punctuated_word: 'Hello', speaker: 0 },
                { word: 'world', punctuated_word: 'world', speaker: 0 }
              ]
            }]
          },
          is_final: false
        })
      }
    })

    // Verify interim text appears (italic styling indicates interim)
    cy.get('.turn').should('exist')
    cy.contains('Hello world').should('exist')
  })

  it('should display final transcription results', () => {
    // Start recording
    cy.get('button[title="Start Recording"]').click()
    cy.wait(1000)

    // Trigger final transcription result
    cy.window().then((win) => {
      if (win.__deepgramMock?.triggerTranscript) {
        win.__deepgramMock.triggerTranscript({
          channel: {
            alternatives: [{
              transcript: 'This is a test transcription.',
              words: [
                { word: 'This', punctuated_word: 'This', speaker: 0 },
                { word: 'is', punctuated_word: 'is', speaker: 0 },
                { word: 'a', punctuated_word: 'a', speaker: 0 },
                { word: 'test', punctuated_word: 'test', speaker: 0 },
                { word: 'transcription', punctuated_word: 'transcription.', speaker: 0 }
              ]
            }]
          },
          is_final: true
        })
      }
    })

    // Verify the transcription text appears
    cy.contains('This is a test transcription.').should('be.visible')
    
    // Verify speaker label appears
    cy.contains('Speaker 0').should('be.visible')
  })

  it('should handle speaker diarization with multiple speakers', () => {
    // Start recording
    cy.get('button[title="Start Recording"]').click()
    cy.wait(1000)

    // Trigger transcript with Speaker 0
    cy.window().then((win) => {
      if (win.__deepgramMock?.triggerTranscript) {
        win.__deepgramMock.triggerTranscript({
          channel: {
            alternatives: [{
              transcript: 'Hello, how are you?',
              words: [
                { word: 'Hello', punctuated_word: 'Hello,', speaker: 0 },
                { word: 'how', punctuated_word: 'how', speaker: 0 },
                { word: 'are', punctuated_word: 'are', speaker: 0 },
                { word: 'you', punctuated_word: 'you?', speaker: 0 }
              ]
            }]
          },
          is_final: true
        })
      }
    })

    // Trigger transcript with Speaker 1
    cy.window().then((win) => {
      if (win.__deepgramMock?.triggerTranscript) {
        win.__deepgramMock.triggerTranscript({
          channel: {
            alternatives: [{
              transcript: 'I am doing great, thank you!',
              words: [
                { word: 'I', punctuated_word: 'I', speaker: 1 },
                { word: 'am', punctuated_word: 'am', speaker: 1 },
                { word: 'doing', punctuated_word: 'doing', speaker: 1 },
                { word: 'great', punctuated_word: 'great,', speaker: 1 },
                { word: 'thank', punctuated_word: 'thank', speaker: 1 },
                { word: 'you', punctuated_word: 'you!', speaker: 1 }
              ]
            }]
          },
          is_final: true
        })
      }
    })

    // Verify both speakers appear
    cy.contains('Speaker 0').should('be.visible')
    cy.contains('Speaker 1').should('be.visible')
    cy.contains('Hello, how are you?').should('be.visible')
    cy.contains('I am doing great, thank you!').should('be.visible')
  })

  it('should handle utterance end events', () => {
    // Start recording
    cy.get('button[title="Start Recording"]').click()
    cy.wait(1000)

    // Add some interim text first
    cy.window().then((win) => {
      if (win.__deepgramMock?.triggerTranscript) {
        win.__deepgramMock.triggerTranscript({
          channel: {
            alternatives: [{
              transcript: 'Testing utterance end',
              words: [
                { word: 'Testing', punctuated_word: 'Testing', speaker: 0 },
                { word: 'utterance', punctuated_word: 'utterance', speaker: 0 },
                { word: 'end', punctuated_word: 'end', speaker: 0 }
              ]
            }]
          },
          is_final: false
        })
      }
    })

    cy.contains('Testing utterance end').should('exist')

    // Trigger utterance end
    cy.window().then((win) => {
      if (win.__deepgramMock?.triggerUtteranceEnd) {
        win.__deepgramMock.triggerUtteranceEnd()
      }
    })

    // The text should still be visible (finalized)
    cy.contains('Testing utterance end').should('be.visible')
  })

  it('should complete full recording session with multiple events', () => {
    // Start recording
    cy.get('button[title="Start Recording"]').click()
    cy.wait(1000)
    cy.contains('REC').should('be.visible')

    // Simulate multiple transcription events
    const transcriptEvents = [
      { text: 'Hello everyone.', speaker: 0, final: true },
      { text: 'Welcome to the meeting.', speaker: 0, final: true },
      { text: 'Thanks for having me.', speaker: 1, final: true },
      { text: 'Let us get started.', speaker: 0, final: true }
    ]

    transcriptEvents.forEach((event, index) => {
      cy.window().then((win) => {
        if (win.__deepgramMock?.triggerTranscript) {
          const words = event.text.split(' ').map((word, i, arr) => ({
            word: word.replace(/[.,]/g, ''),
            punctuated_word: i === arr.length - 1 && event.text.includes('.') ? word : word,
            speaker: event.speaker
          }))

          win.__deepgramMock.triggerTranscript({
            channel: {
              alternatives: [{
                transcript: event.text,
                words: words
              }]
            },
            is_final: event.final
          })
        }
      })
      cy.wait(100)
    })

    // Verify all transcripts appear
    cy.contains('Hello everyone.').should('be.visible')
    cy.contains('Welcome to the meeting.').should('be.visible')
    cy.contains('Thanks for having me.').should('be.visible')
    cy.contains('Let us get started.').should('be.visible')

    // Stop recording
    cy.get('button[title="Stop Recording"]').click()
    cy.wait(200)
    cy.contains('IDLE').should('be.visible')

    // Verify transcripts are still visible after stopping
    cy.contains('Hello everyone.').should('be.visible')
  })

  it('should handle error state gracefully', () => {
    // Start recording
    cy.get('button[title="Start Recording"]').click()
    cy.wait(1000)
    cy.contains('REC').should('be.visible')

    // Trigger an error
    cy.window().then((win) => {
      if (win.__deepgramMock?.triggerError) {
        win.__deepgramMock.triggerError(new Error('Connection failed'))
      }
    })

    // Application should still be in a functional state
    cy.contains('REC').should('be.visible')

    // Should be able to stop recording
    cy.get('button[title="Stop Recording"]').click()
    cy.wait(200)
    cy.contains('IDLE').should('be.visible')
  })

  it('should show disabled pause button when not recording', () => {
    // Verify pause button is disabled initially
    cy.get('button[title="Pause Recording"]').should('be.disabled')

    // Start recording
    cy.get('button[title="Start Recording"]').click()
    cy.wait(500)

    // Pause button should now be enabled
    cy.get('button[title="Pause Recording"]').should('not.be.disabled')

    // Stop recording
    cy.get('button[title="Stop Recording"]').click()
    cy.wait(200)

    // Pause button should be disabled again
    cy.get('button[title="Pause Recording"]').should('be.disabled')
  })
})
