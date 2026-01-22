describe('Homepage', () => {
  it('displays the application title', () => {
    cy.visit('/u/')
    cy.contains('mtranscribe').should('be.visible')
  })
})
