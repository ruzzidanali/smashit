export const API_BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:4000";

/**
 * Back-compat alias (older files imported API_BASE).
 * Prefer API_BASE_URL going forward.
 */
export const API_BASE = API_BASE_URL;

export function authHeader() {
  const token = localStorage.getItem("smashit_owner_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
