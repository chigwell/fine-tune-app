const AUTH_EMAIL_KEY = "fine_tune_auth_email";
const AUTH_COOKIE_KEY = "fine_tune_auth_email";
const AUTH_TOKEN_KEY = "fine_tune_auth_token";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const canAccessBrowserStorage = () => typeof window !== "undefined";

const getCookieEmail = () => {
  if (!canAccessBrowserStorage() || !document.cookie) return "";

  const match = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${AUTH_COOKIE_KEY}=`));

  if (!match) return "";

  return decodeURIComponent(match.split("=")[1] || "");
};

export const getAuthEmail = () => {
  if (!canAccessBrowserStorage()) return "";

  const storedEmail = window.localStorage.getItem(AUTH_EMAIL_KEY);
  if (storedEmail) return storedEmail;

  return getCookieEmail();
};

export const getAuthToken = () => {
  if (!canAccessBrowserStorage()) return "";
  return window.localStorage.getItem(AUTH_TOKEN_KEY) || "";
};

export const setAuthEmail = (email) => {
  if (!canAccessBrowserStorage() || !email) return;

  window.localStorage.setItem(AUTH_EMAIL_KEY, email);

  const expires = new Date(Date.now() + THIRTY_DAYS_MS).toUTCString();
  document.cookie = `${AUTH_COOKIE_KEY}=${encodeURIComponent(
    email
  )}; path=/; expires=${expires}; SameSite=Lax`;
};

export const clearAuth = () => {
  if (!canAccessBrowserStorage()) return;

  window.localStorage.removeItem(AUTH_EMAIL_KEY);
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  document.cookie = `${AUTH_COOKIE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
};

export const isAuthenticated = () => Boolean(getAuthEmail());

export const setAuthSession = (email, token) => {
  setAuthEmail(email);
  if (!canAccessBrowserStorage() || !token) return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const decodeJwt = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
};

export const isTokenExpired = (token) => {
  const payload = decodeJwt(token);
  if (!payload?.exp) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp < nowSeconds;
};
