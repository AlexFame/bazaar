"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n-client";
import { geocodeAddress, getUserLocation, reverseGeocode } from "@/lib/geocoding";

export default function LocationPicker({ location, setLocation, setCoordinates }) {
  const { t } = useLang();
  const [geocoding, setGeocoding] = useState(false);

  async function handleAutoLocation() {
    setGeocoding(true);
    try {
      // 1. Get coordinates
      const coords = await getUserLocation();
      if (!coords) {
        alert("Не удалось получить доступ к геолокации. Проверьте настройки браузера.");
        return;
      }

      if (setCoordinates) setCoordinates(coords);

      // 2. Reverse geocode to get address text
      const address = await reverseGeocode(coords.lat, coords.lng);
      if (address) {
        setLocation(address);
      } else {
        if (address) {
            setLocation(address);
        } else {
            // Fallback to coordinates if address lookup fails
            setLocation(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
            alert("Не удалось определить точный адрес. Пожалуйста, введите название города вручную.");
        }
      }
    } catch (e) {
      console.error("Auto-location error:", e);
      alert("Ошибка при определении местоположения.");
    } finally {
      setGeocoding(false);
    }
  }

  return (
    <div className="mb-3">
      <div className="text-[11px] font-semibold mb-1 dark:text-gray-300">
        {t("field_location_label")}
      </div>
      <div className="relative">
        <input
          type="text"
          placeholder={t("field_location_ph")}
          className="w-full border border-black dark:border-white/20 bg-white dark:bg-neutral-900 text-foreground dark:text-white rounded-xl px-3 py-2 text-sm pr-10 placeholder-gray-500 dark:placeholder-gray-500"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button
          type="button"
          onClick={handleAutoLocation}
          disabled={geocoding}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 disabled:opacity-50"
          title="Определить мое местоположение"
        >
          {geocoding ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
