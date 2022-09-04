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
      cy.contains('[data-test="logout-current-session"]', "Log out");
      cy.get('[data-test="show-password-confirmation-modal"]').should(
        "not.be.visible"
      );

      // 1 second after the password-confirmation token becomes stale
      cy.tick(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_IN + 1000 * 1);

      cy.get('[data-test="show-password-confirmation-modal"]').should(
        "be.visible"
      );
    });

    it("displays the readonly versions of editable sections of the profile if the password-confirmation token is stale", () => {
      // 1 second after the password-confirmation token becomes stale
      cy.tick(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_IN + 1000 * 1);

      cy.get('[data-test="delete-account"]').should("have.attr", "disabled");
      cy.get('[data-test="logout-other-sessions"]').should(
        "have.attr",
        "disabled"
      );

      cy.get("#update-username").should("have.value", userData.username);
      cy.get('[data-test="edit-username"]').should("not.exist");

      cy.get("#update-password").should("be.visible");
      cy.get('[data-test="edit-password"]').should("not.exist");
    });

    context("Log out", () => {
      beforeEach(() => {
        cy.get('[data-test="logout-current-session"]').click();
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
      cy.get('[data-test="logout-other-sessions"]').click();

      cy.location("pathname").should("equal", "/profile");
    });
  });

  context("Password-confirmation modal", () => {
    const userData = {
      username: "username-2001",
      password: "password-2001",
    };

    beforeEach(() => {
      cy.registerUser(userData.username, userData.password);
      cy.loginUser(userData.username, userData.password).then(() => {
        localStorage.removeItem(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT);
      });

      cy.visit("/profile");

      cy.get('[data-test="show-password-confirmation-modal"]').click();
    });

    afterEach(() => {
      cy.deleteUser(userData.username, userData.password);
    });

    it("renders the modal correctly", () => {
      cy.get('[data-test="password-confirmation-modal"]').should("be.visible");

      cy.contains("h2", "Confirm your password");
      cy.get('[data-test="close-password-confirmation-modal"]').should(
        "be.visible"
      );
      cy.get('[data-test="errors"]').should("not.be.visible");
      cy.contains("label", "Password");
      cy.get("#password").should("have.attr", "placeholder", "Your password");
      cy.contains('[data-test="confirm-password"]', "Confirm");
    });

    it("closes the modal if the 'close' button is clicked", () => {
      cy.get('[data-test="close-password-confirmation-modal"]').click();

      cy.get('[data-test="password-confirmation-modal"]').should("not.exist");
    });

    it("displays any received error messages if the password confirmation failed", () => {
      cy.get("#password").type("incorrect-password");
      cy.get('[data-test="confirm-password"]').click();

      cy.get('[data-test="errors"]').should("be.visible");
    });

    it("closes the password-confirmation modal and hides the password-confirmation button if the password-confirmation succeeds", () => {
      cy.get("#password").type(userData.password);
      cy.get('[data-test="confirm-password"]').click();

      cy.get('[data-test="password-confirmation-modal"]').should("not.exist");
      cy.get('[data-test="show-password-confirmation-modal"]').should(
        "not.be.visible"
      );
    });

    it("clears the password field when closing the modal", () => {
      cy.get("#password").type("a-password");
      cy.get('[data-test="close-password-confirmation-modal"]').click();

      cy.get('[data-test="show-password-confirmation-modal"]').click();
      cy.get("#password").invoke("val").should("be.empty");
    });
  });

  context("Update username", () => {
    const userData = {
      username: "username-3001",
      password: "password-3001",
    };

    beforeEach(() => {
      cy.registerUser(userData.username, userData.password);
      cy.loginUser(userData.username, userData.password);

      cy.visit("/profile");
      cy.get('[data-test="edit-username"]').click();
    });

    context("Non username-updating tests", () => {
      afterEach(() => {
        cy.deleteUser(userData.username, userData.password);
      });

      it("displays the input-field, update and cancel buttons when editing", () => {
        cy.get("#update-username").should("have.value", userData.username);
        cy.get('[data-test="update-username"]').should("be.visible");
        cy.get('[data-test="cancel-username-edit"]').should("be.visible");
      });

      it("resets the edit-username input if the editing-session is cancelled", () => {
        cy.get("#update-username").clear();
        cy.get("#update-username").type("one-two-three");

        cy.get('[data-test="cancel-username-edit"]').click();
        cy.get("#update-username").should("have.value", userData.username);
      });

      it("shows any errors that occur during the editing process", () => {
        const anotherUserData = {
          username: "username-3002",
          password: "password-3002",
        };

        cy.registerUser(anotherUserData.username, anotherUserData.password);

        cy.get("#update-username").clear();
        cy.get("#update-username").type(anotherUserData.username);
        cy.get('[data-test="update-username"]').click();

        cy.get('[data-test="username-update-errors"]').should("be.visible");

        cy.deleteUser(anotherUserData.username, anotherUserData.password);
      });
    });

    it("successfully updates the username", () => {
      const newUsername = "new-username";

      cy.get("#update-username").clear();
      cy.get("#update-username").type(newUsername);
      cy.get('[data-test="update-username"]').click();

      cy.get("#update-username").should("have.value", newUsername);

      cy.deleteUser(newUsername, userData.password);
    });

    context("Password is no longer confirmed", () => {
      const anotherUserData = {
        username: "username-3002",
        password: "password-3002",
      };

      it("resets the username-field and clears the errors", () => {
        cy.registerUser(anotherUserData.username, anotherUserData.password);
        cy.loginUser(userData.username, userData.password);

        cy.clock(Date.now());

        cy.visit("/profile");
        cy.get('[data-test="edit-username"]').click();

        cy.get("#update-username").clear();
        cy.get("#update-username").type(anotherUserData.username);
        cy.get('[data-test="update-username"]').click();

        /**
         * Wait until the password-confirmation token is stale.
         * This should happen in 5 minutes.
         * We are waiting for 10 minutes just to be sure.
         *
         * If this fails, see the `JWT_PASSWORD_CONFIRMATION_TOKEN_DURATION`
         * environment variable on the server.
         */
        cy.tick(1000 * 60 * 10);

        cy.get("#update-username").should("have.value", userData.username);
        cy.get('[data-test="username-update-errors"]').should("not.be.visible");

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
      cy.registerUser(userData.username, userData.password);
      cy.loginUser(userData.username, userData.password);

      cy.visit("/profile");
      cy.get('[data-test="edit-password"]').click();
    });

    context("Non password-updating tests", () => {
      afterEach(() => {
        cy.deleteUser(userData.username, userData.password);
      });

      it("displays the input-field, update and cancel buttons when editing", () => {
        cy.get("#update-password").should("have.value", "");
        cy.get('[data-test="update-password"]').should("be.visible");
        cy.get('[data-test="cancel-password-edit"]').should("be.visible");
      });

      it("resets the edit-username input if the editing-session is cancelled", () => {
        cy.get("#update-password").type("one-two-three");

        cy.get('[data-test="cancel-password-edit"]').click();
        cy.get("#update-password").invoke("val").should("be.be.empty");
      });

      it("shows any errors that occur during the editing process", () => {
        const errorMessage = "The password provided is incorrect";

        cy.intercept("PATCH", `${Cypress.env("SERVER_URL")}/user`, {
          statusCode: 400,
          body: {
            statusCode: 400,
            message: [errorMessage],
            error: "Bad Request",
          },
        });

        cy.get("#update-password").type("another-password");
        cy.get('[data-test="update-password"]').click();

        cy.get('[data-test="password-update-errors"]').should(
          "contain",
          errorMessage
        );
      });

      context("Password is no longer confirmed", () => {
        it("resets the password-field and clears the errors", () => {
          const errorMessage = "The password provided is incorrect";

          cy.intercept("PATCH", `${Cypress.env("SERVER_URL")}/user`, {
            statusCode: 400,
            body: {
              statusCode: 400,
              message: [errorMessage],
              error: "Bad Request",
            },
          });

          cy.loginUser(userData.username, userData.password);

          cy.clock(Date.now());

          cy.visit("/profile");
          cy.get('[data-test="edit-password"]').click();

          cy.get("#update-password").type("a-password");
          cy.get('[data-test="update-password"]').click();

          cy.get('[data-test="password-update-errors"]').should(
            "contain",
            errorMessage
          );

          /**
           * Wait until the password-confirmation token is stale.
           * This should happen in 5 minutes.
           * We are waiting for 10 minutes just to be sure.
           *
           * If this fails, see the `JWT_PASSWORD_CONFIRMATION_TOKEN_DURATION`
           * environment variable on the server.
           */
          cy.tick(1000 * 60 * 10);

          cy.get("#update-password").should("have.value", "");
          cy.get('[data-test="password-update-errors"]').should(
            "not.be.visible"
          );
        });
      });
    });

    it("successfully updates the password", () => {
      const newPassword = "le-new-password";

      cy.get("#update-password").type(newPassword);
      cy.get('[data-test="update-password"]').click();

      cy.get("#update-password").should("have.value", "");

      cy.deleteUser(userData.username, newPassword);
    });
  });

  context("Delete account", () => {
    const userData = {
      username: "username-3001",
      password: "password-3001",
    };

    beforeEach(() => {
      cy.registerUser(userData.username, userData.password);
      cy.loginUser(userData.username, userData.password);

      cy.visit("/profile");
      cy.get('[data-test="delete-account"]').click();
    });

    it("redirects the user to the login page after logging out", () => {
      cy.location("pathname").should("equal", "/login");
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
