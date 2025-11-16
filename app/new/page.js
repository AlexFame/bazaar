"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n-client";

const MAX_FILES = 6;

export default function NewListing() {
  const router = useRouter();
  const { t } = useLang();

  const [form, setForm] = useState({
    type: "sell",
    title: "",
    price: "",
    description: "",
    contacts: "",
    location: "",
    files: [],
  });

  const [submitting, setSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFiles = useCallback((filesList) => {
    const files = Array.from(filesList || []);
    setForm((prev) => {
      const merged = [...(prev.files || []), ...files].slice(0, MAX_FILES);
      return { ...prev, files: merged };
    });
  }, []);

  const handleRemoveFile = (index) => {
    setForm((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    if (!form.title.trim()) {
      alert("Заполни заголовок");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        type: form.type,
        title: form.title.trim(),
        price: form.price ? Number(form.price) : null,
        description: form.description.trim() || null,
        contacts: form.contacts.trim() || null,
        location: form.location.trim() || null,
      };

      // ВАЖНО: сюда ставим /api/listing-dev
      const res = await fetch("/api/listing-dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        // пустой ответ — ок
      }

      if (!res.ok) {
        let message = "Ошибка при создании объявления";

        if (data?.error) {
          if (typeof data.error === "string") {
            message = data.error;
          } else {
            message = JSON.stringify(data.error);
          }
        }

        alert(message);
        console.error("Create listing error:", { status: res.status, data });
        return;
      }

      if (data?.id) {
        router.push(`/listing/${data.id}`);
      } else {
        alert("Сервер не вернул ID объявления");
        console.error("No id in response:", data);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("Неизвестная ошибка при создании объявления");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mt-6">
      <div className="rounded-2xl bg-white/90 p-4 shadow-sm backdrop-blur">
        <h1 className="mb-6 text-xl font-semibold">{t("new_heading")}</h1>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="label">{t("field_type")}</label>
            <select
              className="select"
              value={form.type}
              onChange={(e) => updateField("type", e.target.value)}
            >
              <option value="sell">{t("field_type_sell")}</option>
              <option value="buy">{t("field_type_buy")}</option>
              <option value="free">{t("field_type_free")}</option>
            </select>
          </div>

          <div>
            <label className="label">{t("field_title")}</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder={t("field_title_ph")}
            />
          </div>

          <div>
            <label className="label">{t("field_price")}</label>
            <input
              type="number"
              className="input"
              value={form.price}
              onChange={(e) => updateField("price", e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className="label">{t("field_description")}</label>
            <textarea
              className="textarea"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder={t("field_description_ph")}
            />
          </div>

          <div>
            <label className="label">{t("field_contacts")}</label>
            <input
              className="input"
              value={form.contacts}
              onChange={(e) => updateField("contacts", e.target.value)}
              placeholder={t("field_contacts_ph")}
            />
          </div>

          <div>
            <label className="label">{t("field_location")}</label>
            <input
              className="input"
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder={t("field_location_ph")}
            />
          </div>

          <div>
            <label className="label">{t("field_photos")}</label>

            <div className="mt-2 space-y-2">
              {form.files.length > 0 && (
                <div className="space-y-1 text-xs text-gray-600">
                  {form.files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1"
                    >
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        className="text-[11px] text-red-500"
                        onClick={() => handleRemoveFile(idx)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {form.files.length < MAX_FILES && (
                <label className="flex h-32 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white text-center text-sm text-gray-500">
                  {t("field_photos_ph")}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </label>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full disabled:opacity-60"
          >
            {submitting ? `${t("btn_publish")}...` : t("btn_publish")}
          </button>
        </form>
      </div>
    </main>
  );
}
