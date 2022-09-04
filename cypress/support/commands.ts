/* eslint-disable @typescript-eslint/no-namespace */

/// <reference types="cypress" />

import {
  ACCESS_TOKEN_EXPIRES_AT,
  PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
  REFRESH_TOKEN_EXPIRES_AT,
} from "./constants";

Cypress.Commands.add("registerUser", (username: string, password: string) => {
  cy.request("POST", `${Cypress.env("SERVER_URL")}/register`, {
    username,
    password,
  });
});

Cypress.Commands.add("loginUser", (username: string, password: string) => {
  cy.request<{
    accessToken: { expiresAt: number };
    refreshToken: { expiresAt: number };
    passwordConfirmationToken: { expiresAt: number };
  }>("POST", `${Cypress.env("SERVER_URL")}/login`, {
    username,
    password,
  }).then(
    ({ body: { accessToken, refreshToken, passwordConfirmationToken } }) => {
      localStorage.setItem(
        ACCESS_TOKEN_EXPIRES_AT,
        accessToken.expiresAt.toString()
      );
      localStorage.setItem(
        REFRESH_TOKEN_EXPIRES_AT,
        refreshToken.expiresAt.toString()
      );
      localStorage.setItem(
        PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
        passwordConfirmationToken.expiresAt.toString()
      );
    }
  );

  /**
   * We need to manually set the token-cookies in the request because the
   * cookies received from the server are `secure`, and
   * Cypress silently drops them from requests.
   *
   * We therefore remove the `secure` flag from the cookies, and manually
   * re-set them.
   *
   * @see https://github.com/cypress-io/cypress/issues/18690
   */
  cy.getCookies().then((cookies) => {
    cookies.forEach(({ name, value, secure: _, ...options }) => {
      cy.setCookie(name, value, options);
    });
  });
});

Cypress.Commands.add("deleteUser", (username: string, password: string) => {
  cy.loginUser(username, password);

  cy.request("DELETE", `${Cypress.env("SERVER_URL")}/user`);
});

declare global {
  namespace Cypress {
    interface Chainable {
      registerUser(username: string, password: string): Chainable<void>;
      loginUser(username: string, password: string): Chainable<void>;
      deleteUser(username: string, password: string): Chainable<void>;
    }
  }
}

export {};
