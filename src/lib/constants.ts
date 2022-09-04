import type { InjectionKey, Ref } from "vue";

export const ACCESS_TOKEN_EXPIRES_AT = "access-token-expires-at";
export const REFRESH_TOKEN_EXPIRES_AT = "refresh-token-expires-at";
export const PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT =
  "password-confirmation-token-expires-at";

// Injection keys
export const PASSWORD_IS_CONFIRMED = Symbol(
  "passwordIsConfirmed"
) as InjectionKey<Ref<boolean>>;
