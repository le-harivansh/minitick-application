describe("User registration", () => {
  it("redirects the user to /login if the registration succeeds", () => {
    cy.intercept("POST", "/register", { statusCode: 201 });

    const userData = {
      username: "le-username",
      password: "le-password",
    };

    cy.visit("/register");

    cy.get("#username").type(userData.username);
    cy.get("#password").type(userData.password);
    cy.get('[data-test="register-button"]').click();

    cy.location("pathname").should("equal", "/login");
  });

  it("displays any returned error messages if the registration fails", () => {
    const userData = {
      username: "le-username",
      password: "le-password",
    };

    const errorMessages = [
      `The username '${userData.username}' already exists.`,
      "The password should be more than 8 characters",
    ];

    cy.intercept("POST", "/register", {
      statusCode: 400,
      body: {
        statusCode: 400,
        message: errorMessages,
        error: "Bad Request",
      },
    });

    cy.visit("/register");

    cy.get("#username").type(userData.username);
    cy.get("#password").type(userData.password);
    cy.get('[data-test="register-button"]').click();

    cy.get('[data-test="errors"]').should("be.visible");

    errorMessages.forEach((errorMessage) =>
      cy.get('[data-test="errors"]').should("contain.text", errorMessage)
    );

    cy.location("pathname").should("equal", "/register");
  });
});
