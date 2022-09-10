import { shallowMount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PasswordInput from "./PasswordInput.vue";

describe("PasswordInput", () => {
  it("emits the 'update:modelValue' event when a value is typed in the input", async () => {
    const valueToAddToInput = "le-value";

    const wrapper = shallowMount(PasswordInput, {
      props: {
        modelValue: "",
      },
    });

    await wrapper.get("#password").setValue(valueToAddToInput);

    expect(wrapper.emitted("update:modelValue")![0][0]).toBe(valueToAddToInput);
  });
});
