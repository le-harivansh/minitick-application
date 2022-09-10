import { flushPromises, shallowMount } from "@vue/test-utils";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import UpdateUserField from "./UpdateUserField.vue";

describe.each<{
  fieldToUpdate: "username" | "password";
  fieldInitialValue?: string;
  fieldType: "text" | "password";
  fieldPlaceholder: string;
  fieldPattern: string;
  fieldTitle: string;
  fieldAutocomplete: string;
  clearAfterUpdate?: boolean;
}>([
  {
    fieldToUpdate: "username" as const,
    fieldInitialValue: "le-username",
    fieldType: "text" as const,
    fieldPlaceholder: "Your new username",
    fieldPattern: ".{4,}",
    fieldTitle: "The provided username should be at least 4 characters long.",
    fieldAutocomplete: "username",
  },
  {
    fieldToUpdate: "password" as const,
    fieldType: "password" as const,
    fieldPlaceholder: "Your new password",
    fieldPattern: ".{8,}",
    fieldTitle: "The provided password should be at least 8 characters long.",
    fieldAutocomplete: "new-password",
    clearAfterUpdate: true,
  },
])(
  "UpdateUserField [$fieldToUpdate]",
  ({
    fieldToUpdate,
    fieldInitialValue = undefined,
    fieldType,
    fieldPlaceholder,
    fieldPattern,
    fieldTitle,
    fieldAutocomplete,
    clearAfterUpdate = undefined,
  }) => {
    function createWrapper({
      passwordIsConfirmed,
    }: {
      passwordIsConfirmed: boolean;
    }) {
      return shallowMount(UpdateUserField, {
        props: {
          passwordIsConfirmed,
          fieldInitialValue,
          fieldToUpdate,
          fieldType,
          fieldPlaceholder,
          fieldPattern,
          fieldTitle,
          fieldAutocomplete,
          clearAfterUpdate,
        },
      });
    }

    const server = setupServer();

    beforeAll(() => {
      server.listen();
    });

    afterAll(() => {
      server.close();
    });

    it("only displays the label and the input when the passwordIsConfirmed prop is false", () => {
      const wrapper = createWrapper({ passwordIsConfirmed: false });

      expect(wrapper.get('[data-test="field-label"]').isVisible()).toBe(true);
      expect(wrapper.get(`#update-field-${fieldToUpdate}`).isVisible()).toBe(
        true
      );

      expect(wrapper.find('[data-test="edit-field-button"]').exists()).toBe(
        false
      );
      expect(wrapper.find('[data-test="update-field-button"]').exists()).toBe(
        false
      );
      expect(
        wrapper.find('[data-test="cancel-edit-field-button"]').exists()
      ).toBe(false);
    });

    it("also displays the edit-button when the passwordIsConfirmed prop is true", () => {
      const wrapper = createWrapper({ passwordIsConfirmed: true });

      expect(wrapper.get('[data-test="field-label"]').isVisible()).toBe(true);
      expect(wrapper.get(`#update-field-${fieldToUpdate}`).isVisible()).toBe(
        true
      );

      expect(wrapper.find('[data-test="edit-field-button"]').isVisible()).toBe(
        true
      );
      expect(wrapper.find('[data-test="update-field-button"]').exists()).toBe(
        false
      );
      expect(
        wrapper.find('[data-test="cancel-edit-field-button"]').exists()
      ).toBe(false);
    });

    it("displays the update & cancel-update button when the edit-button is clicked", async () => {
      const wrapper = createWrapper({ passwordIsConfirmed: true });

      await wrapper.get('[data-test="edit-field-button"]').trigger("click");

      expect(wrapper.get('[data-test="field-label"]').isVisible()).toBe(true);
      expect(wrapper.get(`#update-field-${fieldToUpdate}`).isVisible()).toBe(
        true
      );

      expect(wrapper.find('[data-test="edit-field-button"]').exists()).toBe(
        false
      );
      expect(
        wrapper.find('[data-test="update-field-button"]').isVisible()
      ).toBe(true);
      expect(
        wrapper.find('[data-test="cancel-edit-field-button"]').isVisible()
      ).toBe(true);
    });

    it("only displays the edit button if the update operation is cancelled", async () => {
      const wrapper = createWrapper({ passwordIsConfirmed: true });

      await wrapper.get('[data-test="edit-field-button"]').trigger("click");
      await wrapper
        .get('[data-test="cancel-edit-field-button"]')
        .trigger("click");

      expect(wrapper.find('[data-test="edit-field-button"]').isVisible()).toBe(
        true
      );
      expect(wrapper.find('[data-test="update-field-button"]').exists()).toBe(
        false
      );
      expect(
        wrapper.find('[data-test="cancel-edit-field-button"]').exists()
      ).toBe(false);
    });

    it("resets the field to its initial value if the update operation is cancelled", async () => {
      const wrapper = createWrapper({ passwordIsConfirmed: true });

      await wrapper.get('[data-test="edit-field-button"]').trigger("click");
      await wrapper.get(`#update-field-${fieldToUpdate}`).setValue("new-value");
      await wrapper
        .get('[data-test="cancel-edit-field-button"]')
        .trigger("click");

      expect(
        wrapper.get<HTMLInputElement>(`#update-field-${fieldToUpdate}`).element
          .value
      ).toBe(fieldInitialValue ?? "");
    });

    describe("on update request failure", () => {
      const updateErrors = ["The field provided is invalid."];

      beforeAll(() => {
        server.use(
          rest.patch("/user", (_, response, context) =>
            response(
              context.status(400),
              context.json({ message: updateErrors })
            )
          )
        );
      });

      afterAll(() => {
        server.resetHandlers();
      });

      it("emits any errors", async () => {
        const wrapper = createWrapper({ passwordIsConfirmed: true });

        await wrapper.get('[data-test="edit-field-button"]').trigger("click");
        await wrapper
          .get(`#update-field-${fieldToUpdate}`)
          .setValue("new-value");
        await wrapper
          .get('[data-test="update-user-field-form"]')
          .trigger("submit");

        await flushPromises();

        expect(wrapper.emitted("updateFailure")).toHaveLength(1);
        expect(wrapper.emitted("updateFailure")![0][0]).toStrictEqual(
          updateErrors
        );
      });

      it("resets the update-field if the `passwordIsConfirmed` prop becomes false mid-update", async () => {
        const wrapper = createWrapper({ passwordIsConfirmed: true });

        await wrapper.get('[data-test="edit-field-button"]').trigger("click");

        await wrapper
          .get(`#update-field-${fieldToUpdate}`)
          .setValue("new-value");
        await wrapper
          .get('[data-test="update-user-field-form"]')
          .trigger("submit");

        await flushPromises();

        await wrapper.setProps({ passwordIsConfirmed: false });

        expect(
          wrapper.get<HTMLInputElement>(`#update-field-${fieldToUpdate}`)
            .element.value
        ).toBe(fieldInitialValue ?? "");
      });
    });

    describe("on update request success", () => {
      beforeAll(() => {
        server.use(
          rest.patch("/user", (_, response, context) =>
            response(context.status(204))
          )
        );
      });

      afterAll(() => {
        server.resetHandlers();
      });

      it("emits the field's new value when the update is successful", async () => {
        const newFieldValue = "new-field-value";
        const wrapper = createWrapper({ passwordIsConfirmed: true });

        await wrapper.get('[data-test="edit-field-button"]').trigger("click");
        await wrapper
          .get(`#update-field-${fieldToUpdate}`)
          .setValue(newFieldValue);
        await wrapper
          .get('[data-test="update-user-field-form"]')
          .trigger("submit");

        await flushPromises();

        expect(wrapper.emitted("updateSuccess")).toHaveLength(1);
        expect(wrapper.emitted("updateSuccess")![0]).toStrictEqual([
          newFieldValue,
        ]);
      });

      it("only displays the edit button when the update is successful", async () => {
        const wrapper = createWrapper({ passwordIsConfirmed: true });

        await wrapper.get('[data-test="edit-field-button"]').trigger("click");
        await wrapper
          .get(`#update-field-${fieldToUpdate}`)
          .setValue("new-value");
        await wrapper
          .get('[data-test="update-user-field-form"]')
          .trigger("submit");

        await flushPromises();

        expect(
          wrapper.find('[data-test="edit-field-button"]').isVisible()
        ).toBe(true);
        expect(wrapper.find('[data-test="update-field-button"]').exists()).toBe(
          false
        );
        expect(
          wrapper.find('[data-test="cancel-edit-field-button"]').exists()
        ).toBe(false);
      });

      it.runIf(clearAfterUpdate === true)(
        "clears the input-field if the `clearAfterUpdate` field is true",
        async () => {
          const wrapper = createWrapper({ passwordIsConfirmed: true });

          await wrapper.get('[data-test="edit-field-button"]').trigger("click");
          await wrapper
            .get(`#update-field-${fieldToUpdate}`)
            .setValue("new-value");
          await wrapper
            .get('[data-test="update-user-field-form"]')
            .trigger("submit");

          await flushPromises();

          expect(
            wrapper.get<HTMLInputElement>(`#update-field-${fieldToUpdate}`)
              .element.value
          ).toBe("");
        }
      );
    });
  }
);
