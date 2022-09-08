import {
  ACCESS_TOKEN_EXPIRES_AT,
  REFRESH_TOKEN_EXPIRES_AT,
  PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
} from "../support/constants";

describe("User authentication", () => {
  it("renders the login page properly", () => {
    cy.visit("/login");

    cy.contains("h2", "Login");
    cy.contains("Username");
    cy.get("#username").should("have.attr", "placeholder", "Your username");
    cy.contains("Password");
    cy.get("#password").should("have.attr", "placeholder", "Your password");
    cy.contains('[data-test="login-button"]', "Login");
  });

  it("redirects authenticated users to / if they try to visit /login", () => {
    const userData = {
      username: "authenticated-user-username",
      password: "authenticated-user-password",
    };

    cy.registerUser(userData.username, userData.password);
    cy.loginUser(userData.username, userData.password);

    cy.visit("/login");
    cy.location("pathname").should("equal", "/");

    cy.deleteUser(userData.username, userData.password);
  });

  it("authenticates users with the correct credentials, and redirects them to /", () => {
    const userCredentials = {
      username: "authenticated-user-username",
      password: "authenticated-user-password",
    };

    cy.registerUser(userCredentials.username, userCredentials.password);

    cy.visit("/login");

    cy.get("#username").type(userCredentials.username);
    cy.get("#password").type(userCredentials.password);
    cy.get('[data-test="login-button"]').click();

    cy.location("pathname").should("equal", "/");

    cy.deleteUser(userCredentials.username, userCredentials.password);
  });

  it("saves the retrieved tokens' expiry timestamps to localStorage", () => {
    const userCredentials = {
      username: "authenticated-user-username",
      password: "authenticated-user-password",
    };

    cy.registerUser(userCredentials.username, userCredentials.password);

    cy.visit("/login");

    cy.get("#username").type(userCredentials.username);
    cy.get("#password").type(userCredentials.password);

    cy.get('[data-test="login-button"]')
      .click()
      .should(() => {
        expect(localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT)).not.to.be.null;
        expect(localStorage.getItem(REFRESH_TOKEN_EXPIRES_AT)).not.to.be.null;
        expect(localStorage.getItem(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT)).not
          .to.be.null;
      });

    cy.deleteUser(userCredentials.username, userCredentials.password);
  });

  it("displays an error message if invalid credentials are provided", () => {
    cy.visit("/login");

    cy.get("#username").type("invalid-username");
    cy.get("#password").type("invalid-password");
    cy.get('[data-test="login-button"]').click();

    cy.get('[data-test="login-errors"]').should("be.visible");

    cy.location("pathname").should("equal", "/login");
  });

  it("clears the previous errors before retrying to log in", () => {
    cy.visit("/login");

    cy.get("#username").type("invalid-username");
    cy.get("#password").type("invalid-password");
    cy.get('[data-test="login-button"]').click();

    cy.get("#username").type("invalid-username");
    cy.get("#password").type("invalid-password");
    cy.get('[data-test="login-button"]').click();

    cy.get('[data-test="login-errors"] li').should("have.length", 1);
  });
});
