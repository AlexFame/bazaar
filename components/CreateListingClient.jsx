"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import { CATEGORY_DEFS } from "@/lib/categories";

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

    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreviews((prev) => [...prev, event.target.result]);
      };
      reader.readAsDataURL(file);
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

      let dbType = listingType;
      if (dbType === "services") {
        dbType = "sell";
      }

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
        })
        .select()
        .single();

      if (insertError) {
        console.error("Ошибка вставки объявления:", insertError);
        setErrorMsg("Ошибка при сохранении объявления.");
        return;
      }

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
            .update({ image_path: mainImagePath })
            .eq("id", listing.id);

          if (updateError) {
            console.error(
              "Ошибка обновления объявления с картинкой:",
              updateError
            );
            setErrorMsg("Объявление создано, но не удалось связать картинку.");
          }
        } else if (hadUploadError) {
          setErrorMsg("Объявление создано, но не удалось загрузить картинку.");
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

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl p-4 shadow-sm"
      >
        {/* ВЫБОР ТИПА */}
        <div className="mb-3">
          <div className="text-xs font-semibold mb-1">{t("field_type")}</div>

          <div
            className="relative inline-block"
            onMouseEnter={handleWrapperEnter}
            onMouseLeave={handleWrapperLeave}
          >
            <button
              type="button"
              className="px-4 py-2 bg-black text-white rounded-full text-xs font-medium"
              onClick={() => setDropdownOpen((prev) => !prev)}
            >
              {t(typeOptions.find((o) => o.value === listingType).labelKey)}
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
                          : "bg-white text-black hover:bg_black/10"
                      }`.replace("hover:bg_black", "hover:bg-black")}
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
          <div className="text-xs font-semibold mb-1">
            {t("field_category")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_DEFS.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategoryKey(cat.key)}
                className={`flex items-center px-3 py-1.5 rounded-full border text-xs font-medium ${
                  categoryKey === cat.key
                    ? "bg-black text-white border-black"
                    : "bg-white text-black border-black/20"
                }`}
              >
                {cat.icon && (
                  <span className="mr-2" aria-hidden="true">
                    {cat.icon}
                  </span>
                )}
                <span>{cat[lang] || cat.ru}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Остальная форма */}
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder={t("field_title_ph")}
            className="w-full border border-black rounded-xl px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            placeholder={t("field_description_ph")}
            className="w-full border border-black rounded-xl px-3 py-2 text-sm min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              placeholder={t("field_price")}
              className="w-1/3 border border-black rounded-xl px-3 py-2 text-sm"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <input
              type="text"
              placeholder={t("field_location_ph")}
              className="flex-1 border border-black rounded-xl px-3 py-2 text-sm"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <input
            type="text"
            placeholder={t("field_contacts_ph")}
            className="w-full border border-black rounded-xl px-3 py-2 text-sm"
            value={contacts}
            onChange={(e) => setContacts(e.target.value)}
          />
        </div>

        {/* ЗОНА ФОТО – МНОГО ФОТО */}
        <div
          className="mt-2 border border-dashed border-black rounded-2xl px-4 py-4 text-xs text-center cursor-pointer bg-white"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <label className="flex flex-col items-center justify-center gap-2 cursor-pointer">
            {imagePreviews.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                {imagePreviews.map((src, idx) => (
                  <img
                    key={idx}
                    src={src}
                    alt={`Предпросмотр ${idx + 1}`}
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                ))}
              </div>
            ) : (
              <span className="text-xs font-semibold">{t("field_photos")}</span>
            )}

            {imagePreviews.length === 0 && (
              <span className="text-[11px] text-black/60 font-semibold">
                {t("field_photos_ph")}
              </span>
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
          className="w-full mt-3 bg-black text-white text-sm font-semibold rounded-full py-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? t("btn_publish") + "..." : t("btn_publish")}
        </button>
      </form>
    </section>
  );
}
