describe("User login", () => {
  it("logs in and redirects a user with the correct credentials to the home page", () => {
    const userCredentials = {
      username: "le-username",
      password: "le-password",
    };

    cy.intercept("POST", "/login", { statusCode: 204 });

    cy.visit("/login");

    cy.get("#username").type(userCredentials.username);
    cy.get("#password").type(userCredentials.password);
    cy.get('[data-test="login-button"]').click();

    cy.location("pathname").should("equal", "/");
  });

  it("displays any returned error messages if the login fails", () => {
    const userCredentials = {
      username: "le-username",
      password: "le-password",
    };

    const errorMessage = "The provided credentials are invalid.";

    cy.intercept("POST", "/login", {
      statusCode: 400,
      body: {
        statusCode: 400,
        message: errorMessage,
        error: "Bad Request",
      },
    });

    cy.visit("/login");

    cy.get("#username").type(userCredentials.username);
    cy.get("#password").type(userCredentials.password);
    cy.get('[data-test="login-button"]').click();

    cy.get('[data-test="errors"]')
      .should("be.visible")
      .and("contain.text", errorMessage);
    cy.location("pathname").should("equal", "/login");
  });
});
