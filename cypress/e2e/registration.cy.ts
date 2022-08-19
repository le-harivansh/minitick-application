describe("User registration", () => {
  it("registers a user", () => {
    const userData = {
      username: "le-username",
      password: "le-password",
    };

    cy.intercept("POST", "/register", { statusCode: 204 });
    cy.intercept("POST", "/login", { statusCode: 204 });

    cy.visit("/register");

    cy.get("#username").type(userData.username);
    cy.get("#password").type(userData.password);
    cy.get('[data-test="register-button"]').click();

    cy.location("pathname").should("equal", "/");
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

    cy.get('[data-test="errors"]')
      .should("be.visible")
      .and("contain.text", errorMessages[0])
      .and("contain.text", errorMessages[1]);
    cy.location("pathname").should("equal", "/register");
  });

  it("displays any returned error messages if the login request fails", () => {
    const userData = {
      username: "le-username",
      password: "le-password",
    };

    const errorMessage = "An error occured. Log in manually.";

    cy.intercept("POST", "/register", { statusCode: 204 });
    cy.intercept("POST", "/login", {
      statusCode: 401,
      body: {
        statusCode: 401,
        message: errorMessage,
        error: "Unauthorized",
      },
    });

    cy.visit("/register");

    cy.get("#username").type(userData.username);
    cy.get("#password").type(userData.password);
    cy.get('[data-test="register-button"]').click();

    cy.get('[data-test="errors"]')
      .should("be.visible")
      .and("contain.text", errorMessage);

    cy.get("#username").invoke("val").should("be.empty");
    cy.get("#password").invoke("val").should("be.empty");

    cy.location("pathname").should("equal", "/register");
  });
});
