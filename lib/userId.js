"use client";

import { getTelegramUser } from "./telegram";

// Возвращает user_id или null
export function getUserId() {
  const user = getTelegramUser();
  return user?.id || null;
}
