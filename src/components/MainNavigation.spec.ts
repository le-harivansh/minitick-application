import { shallowMount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import MainNavigation from "./MainNavigation.vue";
import { useMainStore } from "../stores/main";
import { stubbedRoutes } from "../lib/test/helpers";

function createWrapper() {
  const router = createRouter({
    history: createWebHistory(),
    routes: stubbedRoutes,
  });

  const wrapper = shallowMount(MainNavigation, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn }), router],
    },
  });

  return {
    router,
    wrapper,
  };
}

describe(MainNavigation.name, () => {
  describe("Unauthenticated user", () => {
    it("shows the login & register links to an unauthenticated user", () => {
      const { wrapper } = createWrapper();

      expect(wrapper.find('[data-test="login-navigation-link"]').exists()).toBe(
        true
      );
      expect(
        wrapper.find('[data-test="register-navigation-link"]').exists()
      ).toBe(true);
    });
  });

  describe("Authenticated user", () => {
    it("hides the login & register links of an authenticated user", async () => {
      const { wrapper } = createWrapper();

      const username = "le-username";
      const mainStore = useMainStore();

      mainStore.authenticatedUser.id = "user-id";
      mainStore.authenticatedUser.username = username;

      await nextTick();

      expect(wrapper.find('[data-test="login-navigation-link"]').exists()).toBe(
        false
      );
      expect(
        wrapper.find('[data-test="register-navigation-link"]').exists()
      ).toBe(false);
    });

    it("shows the username of an authenticated user", async () => {
      const { wrapper } = createWrapper();

      const username = "le-username";
      const mainStore = useMainStore();

      mainStore.authenticatedUser.id = "user-id";
      mainStore.authenticatedUser.username = username;

      await nextTick();

      expect(wrapper.text()).toContain(username);
    });

    it("displays only the home button is the user is not in '/'", async () => {
      const { wrapper, router } = createWrapper();

      const username = "le-username";
      const mainStore = useMainStore();

      router.push({ name: "profile" });

      await router.isReady();

      mainStore.authenticatedUser.id = "user-id";
      mainStore.authenticatedUser.username = username;

      await nextTick();

      expect(
        wrapper.get('[data-test="home-navigation-link"]').isVisible()
      ).toBe(true);

      /**
       * @todo: Complete...
       *
       * The 'profile' button's visibility cannot (currently) be checked,
       * since it depends on a class which is added by vue-router.
       *
       * From what I can understand, `wrapper.isVisible` only checks the
       * existence of an element (i.e. only `v-show` & `v-if` are relevant).
       *
       * To complete this test, I need to assert that [data-test="profile-navigation-link"]
       * is not visible. Although I can easily do this by replacing the
       * `active-class` prop with a `v-show` directive, I would like to find
       * a way to do this using the `active-class` prop, since it is a working
       * and elegant solution.
       */
    });

    it("displays only the profile button is the user is not in '/profile'", async () => {
      const { wrapper, router } = createWrapper();

      const username = "le-username";
      const mainStore = useMainStore();

      router.push({ name: "home" });

      await router.isReady();

      mainStore.authenticatedUser.id = "user-id";
      mainStore.authenticatedUser.username = username;

      await nextTick();

      expect(
        wrapper.get('[data-test="profile-navigation-link"]').isVisible()
      ).toBe(true);

      /**
       * @todo: Ditto. (see above)
       */
    });
  });
});
