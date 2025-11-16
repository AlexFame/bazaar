// lib/clientId.js

// Генерим и храним уникальный id устройства (клиента).
// Он будет писаться в колонку listings.created_by.
export function getClientId() {
  if (typeof window === "undefined") return null;

  const KEY = "bazaar_client_id";
  let id = window.localStorage.getItem(KEY);

  if (!id) {
    // uuid – Postgres норм пишет в uuid-колонку
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    window.localStorage.setItem(KEY, id);
  }

  return id;
}
