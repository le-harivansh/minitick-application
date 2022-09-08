describe("Main navigation", () => {
  context("login", () => {
    beforeEach(() => {
      cy.visit("/login");
    });

    it("should show the register & login buttons", () => {
      cy.get('[data-test="register-navigation-link"]').should("be.visible");
      cy.get('[data-test="login-navigation-link"]').should("be.visible");
    });
  });

  context("register", () => {
    beforeEach(() => {
      cy.visit("/register");
    });

    it("should show the register & login buttons", () => {
      cy.get('[data-test="register-navigation-link"]').should("be.visible");
      cy.get('[data-test="login-navigation-link"]').should("be.visible");
    });
  });

  context("home", () => {
    const userData = {
      username: "username #1001",
      password: "password #1001",
    };

    beforeEach(() => {
      cy.registerUser(userData.username, userData.password);
      cy.loginUser(userData.username, userData.password);

      cy.visit("/");
    });

    afterEach(() => {
      cy.deleteUser(userData.username, userData.password);
    });

    it("should not display the register & login buttons", () => {
      cy.get('[data-test="register-navigation-link"]').should("not.exist");
      cy.get('[data-test="login-navigation-link"]').should("not.exist");
    });

    it("should display the authenticated user's username", () => {
      cy.contains(userData.username);
    });

    it("should display the profile link", () => {
      cy.get('[data-test="profile-navigation-link"]').should("be.visible");
    });

    it("should not display the home link", () => {
      cy.get('[data-test="home-navigation-link"]').should("not.be.visible");
    });
  });

  context("profile", () => {
    const userData = {
      username: "username #1002",
      password: "password #1002",
    };

    beforeEach(() => {
      cy.registerUser(userData.username, userData.password);
      cy.loginUser(userData.username, userData.password);

      cy.visit("/profile");
    });

    afterEach(() => {
      cy.deleteUser(userData.username, userData.password);
    });

    it("should display the home link", () => {
      cy.get('[data-test="home-navigation-link"]').should("be.visible");
    });

    it("should not display the profile link", () => {
      cy.get('[data-test="profile-navigation-link"]').should("not.be.visible");
    });
  });
});
