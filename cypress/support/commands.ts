/* eslint-disable @typescript-eslint/no-namespace */

/// <reference types="cypress" />

import {
  ACCESS_TOKEN_EXPIRES_AT,
  PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
  REFRESH_TOKEN_EXPIRES_AT,
} from "./constants";

/**
 * Register user
 */
Cypress.Commands.add("registerUser", (username: string, password: string) => {
  cy.request({
    method: "POST",
    url: `${Cypress.env("SERVER_URL")}/register`,
    body: { username, password },
    log: false,
  });

  Cypress.log({
    name: "Register user",
    displayName: "register-user",
    message: username,
    consoleProps: () => ({
      username,
      password,
    }),
  });

  return cy.wrap({ username, password }, { log: false });
});

/**
 * Login user
 *
 * This command can be chained off of the `register` command, or used as a
 * parent command.
 */
Cypress.Commands.add(
  "loginUser",
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  { prevSubject: "optional" },
  (
    subject?: { username: string; password: string },
    usernameOrOptions: string | { log: boolean } = { log: true },
    password?: string,
    options: { log: boolean } = { log: true }
  ) => {
    const userCredentials: {
      username: string | null;
      password: string | null;
    } = { username: null, password: null };

    if (subject && subject.username && subject.password) {
      userCredentials.username = subject.username;
      userCredentials.password = subject.password;

      options.log = (usernameOrOptions as { log: boolean }).log ?? true;
    } else {
      userCredentials.username = usernameOrOptions as string;
      userCredentials.password = password ?? null;
    }

    if (
      !userCredentials.username ||
      typeof userCredentials.username !== "string"
    ) {
      throw new Error("The username provided is invalid.");
    }
    if (
      !userCredentials.password ||
      typeof userCredentials.password !== "string"
    ) {
      throw new Error("The password provided is invalid.");
    }

    cy.request<{
      accessToken: { expiresAt: number };
      refreshToken: { expiresAt: number };
      passwordConfirmationToken: { expiresAt: number };
    }>({
      method: "POST",
      url: `${Cypress.env("SERVER_URL")}/login`,
      body: userCredentials,
      log: false,
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
    cy.getCookies({ log: false }).then((cookies) => {
      cookies.forEach(({ name, value, secure: _, ...options }) => {
        cy.setCookie(name, value, { ...options, log: false });
      });
    });

    if (options.log) {
      Cypress.log({
        name: "Login user",
        displayName: "login-user",
        message: userCredentials.username,
        consoleProps: () => userCredentials,
      });
    }
  }
);

/**
 * Delete user
 */
Cypress.Commands.add("deleteUser", (username: string, password: string) => {
  cy.loginUser(username, password, { log: false }).then(() => {
    cy.request({
      method: "DELETE",
      url: `${Cypress.env("SERVER_URL")}/user`,
      log: false,
    });

    cy.clearCookies({ log: false });

    Cypress.log({
      name: "Delete user",
      displayName: "delete-user",
      message: username,
      consoleProps: () => ({
        username,
        password,
      }),
    });
  });
});

/**
 * Add tasks
 *
 * This command is meant to be chained off of the `register` command.
 */
Cypress.Commands.add(
  "addTasks",
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  { prevSubject: true },
  (
    userCredentials: { username: string; password: string },
    tasks: { title: string; isComplete?: boolean }[]
  ) => {
    if (
      !userCredentials.username ||
      typeof userCredentials.username !== "string"
    ) {
      throw new Error("The username provided is invalid.");
    }
    if (
      !userCredentials.password ||
      typeof userCredentials.password !== "string"
    ) {
      throw new Error("The password provided is invalid.");
    }

    cy.loginUser(userCredentials.username, userCredentials.password, {
      log: false,
    }).then(() => {
      for (const task of tasks) {
        cy.request<{
          _id: string;
          title: string;
          isComplete: boolean;
        }>({
          method: "POST",
          url: `${Cypress.env("SERVER_URL")}/task`,
          body: { title: task.title },
          log: false,
        }).then(({ body: { _id: taskId } }) => {
          if (task.isComplete) {
            cy.request({
              method: "PATCH",
              url: `${Cypress.env("SERVER_URL")}/task/${taskId}`,
              body: { isComplete: true },
              log: false,
            });
          }
        });
      }
    });

    cy.clearCookies({ log: false });

    Cypress.log({
      name: "Add tasks",
      displayName: "add-tasks",
      message: `Added ${tasks.length} tasks`,
      consoleProps: () => ({ tasks }),
    });

    return cy.wrap(userCredentials, { log: false });
  }
);

declare global {
  namespace Cypress {
    interface Chainable {
      registerUser(
        username: string,
        password: string
      ): Chainable<{ username: string; password: string }>;

      loginUser(options?: { log: boolean }): Chainable<void>;
      loginUser(
        username: string,
        password: string,
        options?: { log: boolean }
      ): Chainable<void>;

      deleteUser(username: string, password: string): Chainable<void>;

      addTasks(
        tasks: { title: string; isComplete?: boolean }[]
      ): Chainable<{ username: string; password: string }>;
    }
  }
}

export {};
