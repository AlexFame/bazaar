"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import { CATEGORY_DEFS } from "@/lib/categories";
import { getTelegramUser } from "@/lib/telegram";

export default function CreateListingClient({ onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [contacts, setContacts] = useState("");

  // МНОГО ФОТО
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const [listingType, setListingType] = useState("buy");
  const [categoryKey, setCategoryKey] = useState(
    CATEGORY_DEFS[0]?.key || "kids"
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { t, lang } = useLang();

  const closeTimeoutRef = useRef(null);

  const typeOptions = [
    { value: "buy", labelKey: "field_type_buy" },
    { value: "sell", labelKey: "field_type_sell" },
    { value: "free", labelKey: "field_type_free" },
    { value: "services", labelKey: "field_type_services" },
  ];

  // добавление файлов из input/drag&drop
  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const limit = 10;
    const spaceLeft = Math.max(limit - imageFiles.length, 0);
    if (spaceLeft <= 0) return;

    const toAdd = incoming.slice(0, spaceLeft);

    setImageFiles((prev) => [...prev, ...toAdd]);

    const newPreviews = toAdd.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  }

  function handleFileChange(e) {
    addFiles(e.target.files);
    e.target.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    addFiles(e.dataTransfer.files);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function removeImage(index) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));

    setImagePreviews((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      if (removed?.url) {
        URL.revokeObjectURL(removed.url);
      }
      return copy;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (!title.trim()) {
        setErrorMsg("Введите заголовок.");
        return;
      }

      // тип из дропдауна
      const dbType = listingType;

      // Берём Telegram-пользователя
      const tgUser = getTelegramUser();
      const createdBy = tgUser?.id ? String(tgUser.id) : null;
      const createdByUsername = tgUser?.username || null;

      const { data: listing, error: insertError } = await supabase
        .from("listings")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          price: price ? Number(price) : null,
          location_text: location.trim() || null,
          contacts: contacts.trim() || "EMPTY",
          type: dbType,
          category_key: categoryKey || null,
          created_by: createdBy,
          created_by_username: createdByUsername,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Ошибка вставки объявления:", insertError);
        setErrorMsg("Ошибка при сохранении объявления.");
        return;
      }

      // Загрузка картинок, если есть
      let hadUploadError = false;

      if (listing && imageFiles.length > 0) {
        const folder = `listing-${listing.id}`;

        for (const file of imageFiles) {
          const ext = file.name.split(".").pop() || "jpg";
          const fileName = `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("listing-images")
            .upload(`${folder}/${fileName}`, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            console.error("Ошибка загрузки файла:", uploadError);
            hadUploadError = true;
          }
        }

        if (!listing.image_path && imageFiles[0]) {
          const firstExt = imageFiles[0].name.split(".").pop() || "jpg";
          const firstName = `${Date.now()}-main.${firstExt}`;

          const { error: uploadErrorMain } = await supabase.storage
            .from("listing-images")
            .upload(`${folder}/${firstName}`, imageFiles[0], {
              cacheControl: "3600",
              upsert: true,
            });

          if (uploadErrorMain) {
            console.error(
              "Ошибка загрузки первой картинки как основной:",
              uploadErrorMain
            );
          } else {
            const { error: updateError } = await supabase
              .from("listings")
              .update({
                image_path: `${folder}/${firstName}`,
              })
              .eq("id", listing.id);

            if (updateError) {
              console.error("Ошибка обновления image_path:", updateError);
            }
          }
        }

        if (hadUploadError) {
          setErrorMsg(
            "Объявление создано, но не удалось загрузить часть изображений."
          );
        }
      }

      setSuccessMsg("Объявление успешно опубликовано!");

      setTitle("");
      setDescription("");
      setPrice("");
      setLocation("");
      setContacts("");
      setImageFiles([]);
      setImagePreviews([]);
      setListingType("buy");
      setCategoryKey(CATEGORY_DEFS[0]?.key || "kids");

      if (onCreated) {
        onCreated();
      }

      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      closeTimeoutRef.current = setTimeout(() => {
        setSuccessMsg("");
      }, 3000);
    } catch (err) {
      console.error("Неожиданная ошибка при создании:", err);
      setErrorMsg("Произошла неожиданная ошибка.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[520px] mx-auto px-3 mt-3"
    >
      {errorMsg && (
        <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mb-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
          {successMsg}
        </div>
      )}

      {/* Тип объявления */}
      <div className="mb-3">
        <div className="text-xs font-semibold mb-1">
          {t("field_type_label")}
        </div>
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className="px-3 py-2 rounded-full border border-black text-xs font-medium bg-white flex items-center gap-1"
          >
            <span>
              {t(
                typeOptions.find((o) => o.value === listingType)?.labelKey ||
                  "field_type_sell"
              )}
            </span>
            <span className="text-[10px]">▼</span>
          </button>

          {dropdownOpen && (
            <div className="absolute mt-1 w-full rounded-2xl border border-black bg-white shadow-lg z-20 overflow-hidden">
              <div className="flex flex-col text-xs">
                {typeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setListingType(opt.value);
                      setDropdownOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-1.5 ${
                      listingType === opt.value
                        ? "bg-black text-white"
                        : "bg-white text-black hover:bg-black/10"
                    }`}
                  >
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Категория */}
      <div className="mb-3">
        <div className="text-xs font-semibold mb-1">{t("field_category")}</div>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORY_DEFS.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategoryKey(cat.key)}
              className={`px-3 py-2 rounded-xl text-xs border ${
                categoryKey === cat.key
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-black/10"
              }`}
            >
              {cat[lang] || cat.ru}
            </button>
          ))}
        </div>
      </div>

      {/* Заголовок */}
      <div className="mb-3">
        <div className="text-xs font-semibold mb-1">{t("field_title")}</div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-black/20 text-sm"
          maxLength={120}
        />
      </div>

      {/* Описание */}
      <div className="mb-3">
        <div className="text-xs font-semibold mb-1">
          {t("field_description")}
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-black/20 text-sm min-h-[80px]"
        />
      </div>

      {/* Цена */}
      <div className="mb-3">
        <div className="text-xs font-semibold mb-1">{t("field_price")}</div>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-black/20 text-sm"
          min={0}
        />
      </div>

      {/* Локация */}
      <div className="mb-3">
        <div className="text-xs font-semibold mb-1">{t("field_location")}</div>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-black/20 text-sm"
        />
      </div>

      {/* Контакты */}
      <div className="mb-3">
        <div className="text-xs font-semibold mb-1">{t("field_contacts")}</div>
        <textarea
          value={contacts}
          onChange={(e) => setContacts(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-black/20 text-sm min-h-[60px]"
          placeholder="@username\n+49123456789"
        />
      </div>

      {/* Фото (много) */}
      <div className="mb-4">
        <div className="text-xs font-semibold mb-1">{t("field_images")}</div>

        <div
          className="border border-dashed border-black/30 rounded-2xl p-3 text-center text-xs text-black/60 cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <p className="mb-1">{t("field_images_hint")}</p>
          <label className="inline-flex items-center px-3 py-1.5 rounded-full bg-black text-white cursor-pointer text-xs">
            {t("btn_choose_images")}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {imagePreviews.length > 0 && (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {imagePreviews.map((img, i) => (
              <div key={i} className="relative">
                <img
                  src={img.url}
                  alt={img.name}
                  className="w-full h-16 object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-full bg-black text-white text-sm font-semibold disabled:opacity-60"
      >
        {loading ? t("btn_publishing") : t("btn_publish")}
      </button>
    </form>
  );
}
