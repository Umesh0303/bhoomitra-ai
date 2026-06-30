// Simple localStorage-based mock auth for v1 foundation.
// Replace with real auth (Lovable Cloud) in a future version.

const KEY = "bhoomitra.auth.user";

export type AuthUser = {
  name: string;
  email: string;
};

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setUser(user: AuthUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(KEY);
}
