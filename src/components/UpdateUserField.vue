<script setup lang="ts">
import axios from "axios";
import { ref, watch } from "vue";
import { nonThrowableServerRequest } from "../lib/helpers";

const props = defineProps<{
  passwordIsConfirmed: boolean;
  fieldInitialValue?: string;
  fieldToUpdate: "username" | "password";
  fieldType: "text" | "password";
  fieldPlaceholder: string;
  fieldPattern: string;
  fieldTitle: string;
  fieldAutocomplete: string;
  clearAfterUpdate?: boolean;
}>();

const emit = defineEmits<{
  (event: "updateSuccess", newValue: string): void;
  (event: "updateFailure", errors: string[]): void;
}>();

const currentlyEditing = ref(false);
const newFieldValue = ref<string>(props.fieldInitialValue ?? "");

async function update() {
  const { errors: updateErrors } = await nonThrowableServerRequest(() =>
    axios.patch<void>("/user", {
      [props.fieldToUpdate]: newFieldValue.value,
    })
  );

  if (updateErrors) {
    return emit("updateFailure", updateErrors);
  }

  currentlyEditing.value = false;

  emit("updateSuccess", newFieldValue.value);

  if (props.clearAfterUpdate) {
    newFieldValue.value = "";
  }
}

function cancelUpdate() {
  newFieldValue.value = props.fieldInitialValue ?? "";
  currentlyEditing.value = false;
}

watch(
  () => props.passwordIsConfirmed,
  (passwordIsConfirmed) => {
    if (!passwordIsConfirmed) {
      cancelUpdate();
    }
  }
);
</script>

<template>
  <form
    @submit.prevent="update"
    class="flex flex-col space-y-1"
    data-test="update-user-field-form"
  >
    <label
      :for="`update-field-${fieldToUpdate}`"
      class="font-semibold"
      data-test="field-label"
    >
      <slot name="label"></slot>
    </label>
    <div class="flex space-x-1">
      <input
        :id="`update-field-${fieldToUpdate}`"
        class="w-full px-2 py-1 rounded focus:outline-none focus:ring-2 field-input"
        :type="fieldType"
        v-model="newFieldValue"
        :placeholder="fieldPlaceholder"
        :pattern="fieldPattern"
        :title="fieldTitle"
        :autocomplete="fieldAutocomplete"
        :disabled="!currentlyEditing"
        required
      />
      <template v-if="passwordIsConfirmed">
        <template v-if="!currentlyEditing">
          <button
            type="button"
            @click="currentlyEditing = true"
            data-test="edit-field-button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5 text-orange-600"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
          </button>
        </template>
        <template v-else>
          <button
            type="submit"
            :disabled="newFieldValue === (fieldInitialValue ?? '')"
            data-test="update-field-button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5"
              :class="[
                newFieldValue === (fieldInitialValue ?? '')
                  ? 'text-gray-600'
                  : 'text-green-600',
              ]"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </button>
          <button
            type="button"
            @click="cancelUpdate"
            data-test="cancel-edit-field-button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5 text-red-500"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </template>
      </template>
    </div>
  </form>
</template>

<style scoped>
.field-input:invalid {
  @apply ring-red-500;
}
</style>
