"use client";

import { useCallback } from "react";

export function useHaptic() {
  const impactOccurred = useCallback((style = "medium") => {
    // style: 'light', 'medium', 'heavy', 'rigid', 'soft'
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
    } else {
      console.log(`📳 Haptic Impact: ${style}`);
    }
  }, []);

  const notificationOccurred = useCallback((type = "success") => {
    // type: 'error', 'success', 'warning'
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
    } else {
      console.log(`📳 Haptic Notification: ${type}`);
    }
  }, []);

  const selectionChanged = useCallback(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.selectionChanged();
    } else {
      console.log(`📳 Haptic Selection Changed`);
    }
  }, []);

  return { impactOccurred, notificationOccurred, selectionChanged };
}
