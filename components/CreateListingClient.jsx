"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import { CATEGORY_DEFS } from "@/lib/categories";
import { getTelegramUser, isTelegramEnv } from "@/lib/telegram";

export default function CreateListingClient({ onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [contacts, setContacts] = useState("");

  // много фото
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

  const closeTimeoutRef = useRef(null);

  // по умолчанию считаем, что НЕ в Telegram
  // и аккуратно несколько раз проверяем окружение,
  // чтобы дождаться инициализации Telegram WebApp
  const [inTelegram, setInTelegram] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20; // ~3 секунды ожидания

    function check() {
      if (cancelled) return;

      try {
        if (isTelegramEnv()) {
          setInTelegram(true);
          return;
        }
      } catch {
        // игнорируем ошибку и пробуем ещё
      }

      attempts += 1;
      if (attempts < maxAttempts) {
        setTimeout(check, 150);
      } else {
        setInTelegram(false);
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, []);

  const typeOptions = [
    { value: "buy", labelKey: "field_type_buy" },
    { value: "sell", labelKey: "field_type_sell" },
    { value: "free", labelKey: "field_type_free" },
    { value: "services", labelKey: "field_type_services" },
  ];

  // добавление файлов из input / dnd
  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const limit = 10;
    const spaceLeft = Math.max(limit - imageFiles.length, 0);
    if (spaceLeft <= 0) return;

    const toAdd = incoming.slice(0, spaceLeft);

    setImageFiles((prev) => [...prev, ...toAdd]);

    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreviews((prev) => [...prev, event.target.result]);
      };
      reader.readAsDataURL(file);
    });
  }

  function handleFileChange(e) {
    addFiles(e.target.files);
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
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  // БЕРЁМ ЕЩЁ И ТЕКУЩИЙ ЯЗЫК
  const { t, lang } = useLang();

  async function handleSubmit(e) {
    e.preventDefault();

    setErrorMsg("");
    setSuccessMsg("");

    if (!title.trim()) {
      setErrorMsg("Введите заголовок объявления.");
      return;
    }

    if (!contacts.trim()) {
      setErrorMsg("Укажите способ связи (телефон или Telegram).");
      return;
    }

    setLoading(true);

    try {
      const dbType = listingType;

      // данные телеграма для личного кабинета
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

      // загрузка картинок
      if (imageFiles.length > 0 && listing) {
        const listingId = listing.id;
        let mainImagePath = null;
        let hadUploadError = false;

        for (let index = 0; index < imageFiles.length; index++) {
          const file = imageFiles[index];
          const ext =
            file.name && file.name.includes(".")
              ? file.name.split(".").pop()
              : "jpg";

          const fileName = `${listingId}-${index}.${ext}`;
          const filePath = `listing-${listingId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("listing-images")
            .upload(filePath, file, {
              cacheControl: "3600",
              upsert: true,
            });

          if (uploadError) {
            console.error("Ошибка загрузки картинки:", uploadError);
            hadUploadError = true;
            continue;
          }

          if (!mainImagePath) {
            mainImagePath = filePath;
          }
        }

        if (mainImagePath) {
          const { error: updateError } = await supabase
            .from("listings")
            .update({ main_image_path: mainImagePath })
            .eq("id", listing.id);

          if (updateError) {
            console.error("Ошибка обновления main_image_path:", updateError);
          }
        }

        if (hadUploadError) {
          setErrorMsg(
            "Объявление сохранено, но часть изображений не удалось загрузить."
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

      if (onCreated) onCreated();

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

  function handleWrapperEnter() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  function handleWrapperLeave() {
    if (dropdownOpen) {
      closeTimeoutRef.current = setTimeout(() => {
        setDropdownOpen(false);
      }, 500);
    }
  }

  // если не в Telegram WebApp – только текст, без формы
  if (!inTelegram) {
    return (
      <section className="w-full max-w-xl mx-auto mt-4 px-3">
        <h1 className="text-lg font-semibold mb-4">{t("new_heading")}</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-3 py-3 text-xs text-black/80">
          <div className="font-semibold mb-1">Открой через Telegram</div>
          <p className="leading-snug">
            Создавать объявления можно только если ты открыл Bazaar из
            Telegram-бота. Открой бота, нажми кнопку с WebApp и попробуй ещё
            раз.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-xl mx-auto mt-4 px-3">
      <h1 className="text-lg font-semibold mb-4">{t("new_heading")}</h1>

      {errorMsg && (
        <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="mb-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#F2F3F7] rounded-2xl p-3">
        {/* тип объявления */}
        <div className="flex flex-col mb-3">
          <div className="text-[11px] font-semibold mb-1">
            {t("field_type_label")}
          </div>

          <div
            className="relative"
            onMouseEnter={handleWrapperEnter}
            onMouseLeave={handleWrapperLeave}
          >
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="w-full border border-black rounded-xl px-3 py-2 text-xs flex items-center justify-between bg-white"
            >
              <span>
                {t(typeOptions.find((o) => o.value === listingType).labelKey)}
              </span>
              <span className="text-[10px]">▼</span>
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 mt-2 w-44 bg-white border border-black rounded-xl shadow-lg z-20 text-xs">
                <div className="py-1">
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

        {/* категория */}
        <div className="flex flex-col mb-3">
          <div className="text-[11px] font-semibold mb-1">
            {t("field_category_label")}
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_DEFS.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategoryKey(cat.key)}
                className={`px-3 py-1.5 rounded-full text-[11px] border ${
                  categoryKey === cat.key
                    ? "bg-black text-white border-black"
                    : "bg-white text-black border-black/10"
                }`}
              >
                {cat.icon && <span className="mr-1.5">{cat.icon}</span>}
                {/* БЕРЁМ ТЕКСТ ПРЯМО ИЗ CATEGORY_DEFS */}
                <span>{cat[lang] || cat.ru}</span>
              </button>
            ))}
          </div>
        </div>

        {/* заголовок */}
        <div className="mb-3">
          <div className="text-[11px] font-semibold mb-1">
            {t("field_title_label")}
          </div>
          <input
            type="text"
            placeholder={t("field_title_ph")}
            className="w-full border border-black rounded-xl px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* описание */}
        <div className="mb-3">
          <div className="text-[11px] font-semibold mb-1">
            {t("field_desc_label")}
          </div>
          <textarea
            rows={4}
            placeholder={t("field_desc_ph")}
            className="w-full border border-black rounded-xl px-3 py-2 text-sm resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* цена */}
        <div className="mb-3">
          <div className="text-[11px] font-semibold mb-1">
            {t("field_price_label")}
          </div>
          <input
            type="number"
            min="0"
            placeholder={t("field_price_ph")}
            className="w-full border border-black rounded-xl px-3 py-2 text-sm"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        {/* локация */}
        <div className="mb-3">
          <div className="text-[11px] font-semibold mb-1">
            {t("field_location_label")}
          </div>
          <input
            type="text"
            placeholder={t("field_location_ph")}
            className="w-full border border-black rounded-xl px-3 py-2 text-sm"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        {/* контакты */}
        <div className="mb-3">
          <div className="text-[11px] font-semibold mb-1">
            {t("field_contacts_label")}
          </div>
          <input
            type="text"
            placeholder={t("field_contacts_ph")}
            className="w-full border border-black rounded-xl px-3 py-2 text-sm"
            value={contacts}
            onChange={(e) => setContacts(e.target.value)}
          />
        </div>

        {/* зона фото – много фото */}
        <div
          className="mt-2 border border-dashed border-black rounded-2xl px-4 py-4 text-xs text-center cursor-pointer bg-white"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <label className="flex flex-col items-center justify-center gap-2 cursor-pointer">
            {imagePreviews.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                {imagePreviews.map((src, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={src}
                      alt={`Предпросмотр ${idx + 1}`}
                      className="h-24 w-24 rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      className="absolute -top-1 -right-1 bg-black text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        removeImage(idx);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="text-xs font-semibold">Загрузите фото</div>
                <div className="text-[11px] text-black/60">
                  Перетащите файлы сюда или нажмите, чтобы выбрать. До 10
                  изображений.
                </div>
              </>
            )}

            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-3 bg-black text-white text-sm rounded-full py-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? t("btn_publish") + "..." : t("btn_publish")}
        </button>
      </form>
    </section>
  );
}
