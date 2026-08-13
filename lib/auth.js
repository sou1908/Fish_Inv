// Single shared-password gate. No accounts.
// The cookie holds an HMAC-ish digest of (secret + password) so it can't be
// forged without knowing both, and it invalidates automatically if the
// password or secret changes. Works in both Edge middleware and Node routes.

export const COOKIE_NAME = "fish_session";

export async function sessionToken() {
  const secret = process.env.AUTH_SECRET || "dev-secret";
  const password = process.env.APP_PASSWORD || "";
  const data = new TextEncoder().encode(`${secret}::${password}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidToken(token) {
  if (!token) return false;
  const expected = await sessionToken();
  // constant-time-ish compare
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
