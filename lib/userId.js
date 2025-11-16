// lib/userId.js
export function getOrCreateUserId() {
  if (typeof window === "undefined") return null;

  const KEY = "bazaar_user_id";

  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
