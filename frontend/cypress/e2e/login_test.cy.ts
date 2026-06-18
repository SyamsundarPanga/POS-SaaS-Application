describe('Login Test', () => {
  it('should load the application', () => {
    cy.visit('http://localhost:3000');
    cy.title().should('include', 'PayPoint');
  });
});