describe('Homepage', () => {
  it('displays the application title', () => {
    cy.visit('/')
    cy.contains('mtranscribe').should('be.visible')
  })

  it('displays the description', () => {
    cy.visit('/')
    cy.contains('Live transcription web application').should('be.visible')
  })
})
