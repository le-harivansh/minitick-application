describe("User login", () => {
  it("logs in and redirects a user with the correct credentials to the home page", () => {
    cy.intercept("POST", "/login", {
      statusCode: 200,
      body: {
        accessToken: { expiresAt: Date.now() },
        refreshToken: { expiresAt: Date.now() },
        passwordConfirmationToken: { expiresAt: Date.now() },
      },
    });
    cy.intercept("GET", "/user", {
      statusCode: 200,
      body: { id: "user-id", username: "username" },
    });

    const userCredentials = {
      username: "le-username",
      password: "le-password",
    };

    cy.visit("/login");

    cy.get("#username").type(userCredentials.username);
    cy.get("#password").type(userCredentials.password);
    cy.get('[data-test="login-button"]').click();

    cy.location("pathname").should("equal", "/");
  });

  it("displays an error message if invalid credentials are provided", () => {
    const errorMessage = "The provided credentials are invalid.";

    cy.intercept("POST", "/login", {
      statusCode: 401,
      body: {
        statusCode: 401,
        message: errorMessage,
        error: "Bad Request",
      },
    });

    const userCredentials = {
      username: "le-username",
      password: "le-password",
    };

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
