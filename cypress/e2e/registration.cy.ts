describe("User registration", () => {
  context("[rendering]", () => {
    before(() => {
      cy.visit("/register");
    });

    it("displays the register title", () => {
      cy.contains("h2", "Register");
    });

    it("displays the username field", () => {
      cy.contains("Username");
      cy.get("#username").should(
        "have.attr",
        "placeholder",
        "Your new username"
      );
    });

    it("displays the password field", () => {
      cy.contains("Password");
      cy.get("#password").should(
        "have.attr",
        "placeholder",
        "Your new password"
      );
    });

    it("displays the register button", () => {
      cy.contains('[data-test="register-button"]', "Register");
    });
  });

  it("redirects an authenticated user to / (if it tries to visit /register)", () => {
    const userData = {
      username: "authenticated-user-username",
      password: "authenticated-user-password",
    };

    cy.registerUser(userData.username, userData.password);
    cy.loginUser(userData.username, userData.password);

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

    cy.get('[data-test="errors"]').should("be.visible");

    cy.location("pathname").should("equal", "/register");

    cy.deleteUser(userData.username, userData.password);
  });
});
