import {
  ACCESS_TOKEN_EXPIRES_AT,
  REFRESH_TOKEN_EXPIRES_AT,
  PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
  PASSWORD_CONFIRMATION_TOKEN_EXPIRES_IN,
} from "../support/constants";

describe("User profile", () => {
  context("General", () => {
    const userData = {
      username: "username-2001",
      password: "password-2001",
    };

    before(() => {
      cy.registerUser(userData.username, userData.password);
    });

    beforeEach(() => {
      cy.loginUser(userData.username, userData.password);

      cy.clock(Date.now());

      cy.visit("/profile");
    });

    after(() => {
      cy.deleteUser(userData.username, userData.password);
    });

    it("cannot be accessed by an unauthenticated user", () => {
      cy.clearCookies();

      cy.visit("/profile");

      cy.location("pathname").should("equal", "/login");
    });

    it("correctly renders the view", () => {
      cy.contains("h2", "Profile");
      cy.contains('[data-test="logout-current-session-button"]', "Log out");
      cy.get('[data-test="show-password-confirmation-modal-button"]').should(
        "not.be.visible"
      );

      // 1 second after the password-confirmation token becomes stale
      cy.tick(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_IN + 1000 * 1);

      cy.get('[data-test="show-password-confirmation-modal-button"]').should(
        "be.visible"
      );
    });

    it("displays the readonly versions of editable sections of the profile if the password-confirmation token is stale", () => {
      // 1 second after the password-confirmation token becomes stale
      cy.tick(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_IN + 1000 * 1);

      cy.get('[data-test="delete-account-button"]').should(
        "have.attr",
        "disabled"
      );
      cy.get('[data-test="logout-other-sessions-button"]').should(
        "have.attr",
        "disabled"
      );

      cy.get("#update-field-username")
        .should("have.value", userData.username)
        .and("have.attr", "disabled");
      cy.get('#update-field-username ~ [data-test="edit-field-button"]').should(
        "not.exist"
      );

      cy.get("#update-field-password")
        .should("be.visible")
        .and("have.attr", "disabled");
      cy.get(
        '#update-field-password ~ [data-test="update-field-button"]'
      ).should("not.exist");
    });

    context("Log out", () => {
      beforeEach(() => {
        cy.get('[data-test="logout-current-session-button"]').click();
      });

      it("redirects the user to the login page after logging out", () => {
        cy.location("pathname").should("equal", "/login");
      });

      it("removes all the token expiry timestamps from localStorage", () => {
        cy.location().should(() => {
          expect(localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT)).to.be.null;
          expect(localStorage.getItem(REFRESH_TOKEN_EXPIRES_AT)).to.be.null;
          expect(localStorage.getItem(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT))
            .to.be.null;
        });
      });
    });

    it("remains on the profile page when logging out of other sessions", () => {
      cy.get('[data-test="logout-other-sessions-button"]').click();

      cy.location("pathname").should("equal", "/profile");
    });
  });

  context("Password-confirmation modal", () => {
    const userData = {
      username: "username-2001",
      password: "password-2001",
    };

    beforeEach(() => {
      cy.registerUser(userData.username, userData.password)
        .loginUser()
        .then(() => {
          localStorage.removeItem(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT);
        });

      cy.visit("/profile");

      cy.get('[data-test="show-password-confirmation-modal-button"]').click();
    });

    afterEach(() => {
      cy.deleteUser(userData.username, userData.password);
    });

    it("renders the modal correctly", () => {
      cy.get('[data-test="password-confirmation-modal"]').should("be.visible");

      cy.contains("h2", "Confirm your password");
      cy.get('[data-test="close-password-confirmation-modal-button"]').should(
        "be.visible"
      );
      cy.get('[data-test="password-confirmation-errors"]').should(
        "not.be.visible"
      );
      cy.contains("label", "Password");
      cy.get("#password").should("have.attr", "placeholder", "Your password");
      cy.contains('[data-test="confirm-password-button"]', "Confirm");
    });

    it("closes the modal if the 'close' button is clicked", () => {
      cy.get('[data-test="close-password-confirmation-modal-button"]').click();

      cy.get('[data-test="password-confirmation-modal"]').should("not.exist");
    });

    it("displays any received error messages if the password confirmation failed", () => {
      cy.get("#password").type("incorrect-password");
      cy.get('[data-test="confirm-password-button"]').click();

      cy.get('[data-test="password-confirmation-errors"]').should("be.visible");
    });

    it("closes the password-confirmation modal and hides the password-confirmation button if the password-confirmation succeeds", () => {
      cy.get("#password").type(userData.password);
      cy.get('[data-test="confirm-password-button"]').click();

      cy.get('[data-test="password-confirmation-modal"]').should("not.exist");
      cy.get('[data-test="show-password-confirmation-modal-button"]').should(
        "not.be.visible"
      );
    });

    it("clears the password field when closing the modal", () => {
      cy.get("#password").type("a-password");
      cy.get('[data-test="close-password-confirmation-modal-button"]').click();

      cy.get('[data-test="show-password-confirmation-modal-button"]').click();
      cy.get("#password").invoke("val").should("be.empty");
    });
  });

  context("Update username", () => {
    const userData = {
      username: "username-3001",
      password: "password-3001",
    };

    beforeEach(() => {
      cy.registerUser(userData.username, userData.password).loginUser();

      cy.visit("/profile");
      cy.get(
        '#update-field-username ~ [data-test="edit-field-button"]'
      ).click();
    });

    it("successfully updates the username", () => {
      const newUsername = "new-username";

      cy.get("#update-field-username").clear();
      cy.get("#update-field-username").type(newUsername);
      cy.get(
        '#update-field-username ~ [data-test="update-field-button"]'
      ).click();

      cy.get("#update-field-username").should("have.value", newUsername);

      cy.deleteUser(newUsername, userData.password);
    });

    context("Non username-updating tests", () => {
      afterEach(() => {
        cy.deleteUser(userData.username, userData.password);
      });

      it("displays the input-field, update and cancel buttons when editing", () => {
        cy.get("#update-field-username").should(
          "have.value",
          userData.username
        );
        cy.get(
          '#update-field-username ~ [data-test="update-field-button"]'
        ).should("be.visible");
        cy.get(
          '#update-field-username ~ [data-test="cancel-edit-field-button"]'
        ).should("be.visible");
      });

      it("resets the edit-username input if the editing-session is cancelled", () => {
        cy.get("#update-field-username").clear();
        cy.get("#update-field-username").type("one-two-three");

        cy.get(
          '#update-field-username ~ [data-test="cancel-edit-field-button"]'
        ).click();
        cy.get("#update-field-username").should(
          "have.value",
          userData.username
        );
      });

      it("shows any errors that occur during the editing process", () => {
        const anotherUserData = {
          username: "username-3002",
          password: "password-3002",
        };

        cy.registerUser(anotherUserData.username, anotherUserData.password);

        cy.get("#update-field-username").clear();
        cy.get("#update-field-username").type(anotherUserData.username);
        cy.get(
          '#update-field-username ~ [data-test="update-field-button"]'
        ).click();

        cy.get('[data-test="profile-view-errors"]').should("be.visible");

        cy.deleteUser(anotherUserData.username, anotherUserData.password);
      });
    });

    context("Password is no longer confirmed", () => {
      it("resets the username-field and clears the errors", () => {
        const anotherUserData = {
          username: "username-3002",
          password: "password-3002",
        };

        cy.registerUser(anotherUserData.username, anotherUserData.password);

        cy.loginUser(userData.username, userData.password);

        cy.clock(Date.now());

        cy.visit("/profile");
        cy.get(
          '#update-field-username ~ [data-test="edit-field-button"]'
        ).click();

        cy.get("#update-field-username").clear();
        cy.get("#update-field-username").type(anotherUserData.username);
        cy.get(
          '#update-field-username ~ [data-test="update-field-button"]'
        ).click();

        /**
         * Wait until the password-confirmation token is stale.
         * This should happen in 5 minutes.
         * We are waiting for 10 minutes just to be sure.
         *
         * If this fails, see the `JWT_PASSWORD_CONFIRMATION_TOKEN_DURATION`
         * environment variable on the server.
         */
        cy.tick(1000 * 60 * 10);

        cy.get("#update-field-username").should(
          "have.value",
          userData.username
        );
        cy.get('[data-test="profile-view-errors"]').should("not.be.visible");

        cy.deleteUser(userData.username, userData.password);
        cy.deleteUser(anotherUserData.username, anotherUserData.password);
      });
    });
  });

  context("Update password", () => {
    const userData = {
      username: "username-3001",
      password: "password-3001",
    };

    beforeEach(() => {
      cy.registerUser(userData.username, userData.password).loginUser();

      cy.visit("/profile");
      cy.get(
        '#update-field-password ~ [data-test="edit-field-button"]'
      ).click();
    });

    it("successfully updates the password", () => {
      const newPassword = "le-new-password";

      cy.get("#update-field-password").type(newPassword);
      cy.get(
        '#update-field-password ~ [data-test="update-field-button"]'
      ).click();

      cy.get("#update-field-password").should("have.value", "");

      cy.deleteUser(userData.username, newPassword);
    });

    context("Non password-updating tests", () => {
      afterEach(() => {
        cy.deleteUser(userData.username, userData.password);
      });

      it("displays the input-field, update and cancel buttons when editing", () => {
        cy.get("#update-field-password").should("have.value", "");
        cy.get(
          '#update-field-password ~ [data-test="update-field-button"]'
        ).should("be.visible");
        cy.get(
          '#update-field-password ~ [data-test="cancel-edit-field-button"]'
        ).should("be.visible");
      });

      it("resets the edit-username input if the editing-session is cancelled", () => {
        cy.get("#update-field-password").type("one-two-three");

        cy.get(
          '#update-field-password ~ [data-test="cancel-edit-field-button"]'
        ).click();
        cy.get("#update-field-password").invoke("val").should("be.be.empty");
      });
    });
  });

  context("Delete account", () => {
    const userData = {
      username: "username-3001",
      password: "password-3001",
    };

    beforeEach(() => {
      cy.registerUser(userData.username, userData.password).loginUser();

      cy.visit("/profile");
      cy.get('[data-test="delete-account-button"]').click();
    });

    it("redirects the user to the register page after logging out", () => {
      cy.location("pathname").should("equal", "/register");
    });

    it("removes all the token expiry timestamps from localStorage", () => {
      cy.location().should(() => {
        expect(localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT)).to.be.null;
        expect(localStorage.getItem(REFRESH_TOKEN_EXPIRES_AT)).to.be.null;
        expect(localStorage.getItem(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT)).to
          .be.null;
      });
    });
  });
});
