// "Remember me" toggles where the session lives: checked -> localStorage (survives
// closing the browser, until the 8h token expires), unchecked -> sessionStorage
// (cleared the moment the tab/browser closes). Read/write helpers check both places so
// nothing else in the app needs to know which one is active.

const TOKEN_KEY = "nexahr_token";
const USER_KEY = "nexahr_user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredUser<T = any>(): T | null {
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(token: string, user: unknown, remember: boolean) {
  const store = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, JSON.stringify(user));
  // Clear the other one in case a previous login used a different remember-me setting.
  other.removeItem(TOKEN_KEY);
  other.removeItem(USER_KEY);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}
