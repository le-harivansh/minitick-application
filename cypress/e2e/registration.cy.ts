describe("User registration", () => {
  it("renders the register page properly", () => {
    cy.visit("/register");

    cy.contains("h2", "Register");

    cy.contains("Username");
    cy.get("#username").should("have.attr", "placeholder", "Your new username");

    cy.contains("Password");
    cy.get("#password").should("have.attr", "placeholder", "Your new password");

    cy.contains('[data-test="register-button"]', "Register");
  });

  it("redirects authenticated users to / if they try to visit /register", () => {
    const userData = {
      username: "authenticated-user-username",
      password: "authenticated-user-password",
    };

    cy.registerUser(userData.username, userData.password).loginUser();

    cy.visit("/register");
    cy.location("pathname").should("equal", "/");

    cy.deleteUser(userData.username, userData.password);
  });

  it("redirects the user to /login if the registration succeeds", () => {
    const userData = {
      username: "username-001",
      password: "password-001",
    };

    cy.visit("/register");

    cy.get("#username").type(userData.username);
    cy.get("#password").type(userData.password);
    cy.get('[data-test="register-button"]').click();

    cy.location("pathname").should("equal", "/login");

    cy.deleteUser(userData.username, userData.password);
  });

  it("displays any returned error messages if the registration fails", () => {
    const userData = {
      username: "username-002",
      password: "password-002",
    };

    cy.registerUser(userData.username, userData.password);

    cy.visit("/register");

    cy.get("#username").type(userData.username);
    cy.get("#password").type(userData.password);
    cy.get('[data-test="register-button"]').click();

    cy.get('[data-test="registration-errors"]').should("be.visible");

    cy.location("pathname").should("equal", "/register");

    cy.deleteUser(userData.username, userData.password);
  });
});
