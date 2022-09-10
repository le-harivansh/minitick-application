describe("Tasks CRUD", () => {
  context("READ", () => {
    it("cannot be accessed by an unauthenticated user", () => {
      cy.visit("/profile");

      cy.location("pathname").should("equal", "/login");
    });

    it("displays a message if the user's task-list is empty", () => {
      const user = {
        username: "le-username-0",
        password: "le-password-0",
      };

      cy.registerUser(user.username, user.password).loginUser();

      cy.visit("/");

      cy.contains("h2", "Tasks");

      cy.contains("h4", "You don't have any tasks.");

      cy.deleteUser(user.username, user.password);
    });

    it("displays all the user's tasks", () => {
      const user = {
        username: "le-username",
        password: "le-password",
        tasks: [
          { title: "One" },
          { title: "Two", isComplete: true },
          { title: "Three", isComplete: false },
          { title: "Four" },
          { title: "Five", isComplete: true },
        ],
      };

      cy.registerUser(user.username, user.password)
        .addTasks(user.tasks)
        .loginUser();

      cy.visit("/");

      cy.contains("h2", "Tasks");

      user.tasks.forEach(({ title: taskTitle }) => cy.contains(taskTitle));

      cy.deleteUser(user.username, user.password);
    });
  });

  context("CREATE", () => {
    const user = {
      username: "user-name",
      password: "pass-word",
    };

    before(() => {
      cy.registerUser(user.username, user.password);
    });

    beforeEach(() => {
      cy.loginUser(user.username, user.password);

      cy.visit("/");
    });

    after(() => {
      cy.deleteUser(user.username, user.password);
    });

    it("can create a task", () => {
      const newTaskTitle = "A new task (success)";

      cy.get('[data-test="create-task-input"]').type(newTaskTitle);
      cy.get('[data-test="create-task-button"]').click();

      cy.get('[data-test="create-task-input"]')
        .invoke("val")
        .should("be.empty");
      cy.contains(newTaskTitle);
    });

    it("displays any errors", () => {
      const errorMessage = "An error occured during the creation of the task.";

      cy.intercept("POST", `${Cypress.env("SERVER_URL")}/task`, {
        statusCode: 400,
        body: {
          message: errorMessage,
        },
      });

      cy.get('[data-test="create-task-input"]').type("A new task (fail)");
      cy.get('[data-test="create-task-button"]').click();

      cy.contains(errorMessage);
    });
  });

  context("UPDATE", () => {
    const user = {
      username: "le-username",
      password: "le-password",
      tasks: [
        { title: "One" },
        { title: "Two", isComplete: true },
        { title: "Three", isComplete: false },
        { title: "Four" },
        { title: "Five", isComplete: true },
      ],
    };

    beforeEach(() => {
      cy.registerUser(user.username, user.password)
        .addTasks(user.tasks)
        .loginUser();

      cy.visit("/");
    });

    afterEach(() => {
      cy.deleteUser(user.username, user.password);
    });

    it("can check an existing task (as completed)", () => {
      const taskToMarkAsCompleted = user.tasks[0];

      cy.get(`[data-test^="task-id-"]:contains(${taskToMarkAsCompleted.title})`)
        .find('[data-test="toggle-check-button"]')
        .click();

      cy.get(`[data-test^="task-id-"]:contains(${taskToMarkAsCompleted.title})`)
        .find('[data-test="task-title"]')
        .should("have.class", "line-through");
    });

    it("can uncheck a completed task (as incomplete)", () => {
      const taskToMarkAsCompleted = user.tasks[1];

      cy.get(`[data-test^="task-id-"]:contains(${taskToMarkAsCompleted.title})`)
        .find('[data-test="toggle-check-button"]')
        .click();

      cy.get(`[data-test^="task-id-"]:contains(${taskToMarkAsCompleted.title})`)
        .find('[data-test="task-title"]')
        .should("not.have.class", "line-through");
    });

    context("update task title", () => {
      let taskToUpdate: { title: string; isComplete?: boolean };

      before(() => {
        taskToUpdate = user.tasks[3];
      });

      it("renders the correct edit elements", () => {
        cy.get(`[data-test^="task-id-"]:contains(${taskToUpdate.title})`).then(
          (element) => {
            const taskComponentSelector = element.attr("data-test") as string;

            cy.get(`[data-test="${taskComponentSelector}"]`)
              .find('[data-test="edit-task-button"]')
              .click();

            cy.get(`[data-test="${taskComponentSelector}"]`)
              .find('[data-test="task-title"]')
              .should("not.exist");

            cy.get(`[data-test="${taskComponentSelector}"]`)
              .find('[data-test="task-edit-input"]')
              .should("be.visible");

            cy.get(`[data-test="${taskComponentSelector}"]`)
              .find('[data-test="update-task-button"]')
              .should("be.visible");

            cy.get(`[data-test="${taskComponentSelector}"]`)
              .find('[data-test="cancel-task-update-button"]')
              .should("be.visible");

            cy.get(`[data-test="${taskComponentSelector}"]`)
              .find('[data-test="edit-task-button"]')
              .should("not.exist");

            cy.get(`[data-test="${taskComponentSelector}"]`)
              .find('[data-test="delete-task-button"]')
              .should("not.exist");
          }
        );
      });

      it("updates a task's title", () => {
        const newTaskTitle = "The new title of the task #101001.";
        cy.get(`[data-test^="task-id-"]:contains(${taskToUpdate.title})`).then(
          (element) => {
            const taskComponentSelector = element.attr("data-test") as string;

            cy.get(`[data-test="${taskComponentSelector}"]`)
              .find('[data-test="edit-task-button"]')
              .click();

            cy.get(`[data-test="${taskComponentSelector}"]`)
              .find('[data-test="task-edit-input"]')
              .type(`{selectAll}${newTaskTitle}`);

            cy.get(`[data-test="${taskComponentSelector}"]`)
              .find('[data-test="update-task-button"]')
              .click();

            cy.get(`[data-test="${taskComponentSelector}"]`)
              .find('[data-test="task-title"]')
              .should("be.visible")
              .and("contain.text", newTaskTitle);
          }
        );
      });
    });

    it("displays any errors", () => {
      const errorMessage = "An error occured during the update of the task.";

      cy.intercept("PATCH", `${Cypress.env("SERVER_URL")}/task/*`, {
        statusCode: 400,
        body: {
          message: errorMessage,
        },
      });

      const taskToUpdate = user.tasks[3];

      cy.get(`[data-test^="task-id-"]:contains(${taskToUpdate.title})`)
        .find('[data-test="toggle-check-button"]')
        .click();

      cy.contains(errorMessage);
      cy.get(`[data-test^="task-id-"]:contains(${taskToUpdate.title})`).should(
        "exist"
      );
    });
  });

  context("DELETE", () => {
    const user = {
      username: "the-username",
      password: "the-password",
      tasks: [
        { title: "One" },
        { title: "Two", isComplete: true },
        { title: "Three", isComplete: false },
        { title: "Four" },
        { title: "Five", isComplete: true },
      ],
    };

    before(() => {
      cy.registerUser(user.username, user.password).addTasks(user.tasks);
    });

    beforeEach(() => {
      cy.loginUser(user.username, user.password);

      cy.visit("/");
    });

    after(() => {
      cy.deleteUser(user.username, user.password);
    });

    it("can delete a task", () => {
      const taskToDelete = user.tasks[3];

      cy.get(`[data-test^="task-id-"]:contains(${taskToDelete.title})`)
        .find('[data-test="delete-task-button"]')
        .dblclick();

      cy.get(`[data-test^="task-id-"]:contains(${taskToDelete.title})`).should(
        "not.exist"
      );
    });

    it("displays any errors", () => {
      const errorMessage = "An error occured during the deletion of the task.";

      cy.intercept("DELETE", `${Cypress.env("SERVER_URL")}/task/*`, {
        statusCode: 400,
        body: {
          message: errorMessage,
        },
      });

      const taskToDelete = user.tasks[0];

      cy.get(`[data-test^="task-id-"]:contains(${taskToDelete.title})`)
        .find('[data-test="delete-task-button"]')
        .dblclick();

      cy.contains(errorMessage);
      cy.get(`[data-test^="task-id-"]:contains(${taskToDelete.title})`).should(
        "exist"
      );
    });
  });
});
