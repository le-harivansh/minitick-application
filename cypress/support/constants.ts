/**
 * The following are the keys of the different timestamps (for the different
 * tokens) stored in localStorage.
 *
 * They should be EXACTLY THE SAME as the ones found in @/lib/constants.ts.
 *
 * The only reason they exist here is because I have not found a good enough
 * way to import the aforementioned constants file in cypress tests.
 */
export const ACCESS_TOKEN_EXPIRES_AT = "access-token-expires-at";
export const REFRESH_TOKEN_EXPIRES_AT = "refresh-token-expires-at";
export const PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT =
  "password-confirmation-token-expires-at";

/**
 * This constant should be exactly equal to the amount it takes for the
 * password-confirmation token to expire.
 *
 * It should be equal to the `JWT_PASSWORD_CONFIRMATION_TOKEN_DURATION`
 * environment variable in the server.
 */
export const PASSWORD_CONFIRMATION_TOKEN_EXPIRES_IN = 1000 * 60 * 5; // 5 minutes
