"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import { CATEGORY_DEFS } from "@/lib/categories";
import { getTelegramUser, isTelegramEnv } from "@/lib/telegram";
import { geocodeAddress } from "@/lib/geocoding";
import BackButton from "@/components/BackButton";

import { checkContent, checkImage, hasEmoji, validateTitle, validateDescription, validatePrice } from "@/lib/moderation";

const typeOptions = [
  { value: "buy", labelKey: "field_type_buy" },
  { value: "sell", labelKey: "field_type_sell" },
  { value: "service", labelKey: "field_type_services" },
  { value: "free", labelKey: "field_type_free" },
];

export default function CreateListingClient({ onCreated, editId }) {
  const { lang, t } = useLang();
  const [images, setImages] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [contacts, setContacts] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [listingType, setListingType] = useState("buy");
  const [categoryKey, setCategoryKey] = useState(CATEGORY_DEFS[0]?.key || "kids");
  const [parameters, setParameters] = useState({});
  const [condition, setCondition] = useState("new");
  const [isBarter, setIsBarter] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [initialImageIds, setInitialImageIds] = useState([]);
  const [coordinates, setCoordinates] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const inTelegram = isTelegramEnv();
  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    if (!editId) return;

    setLoading(true);
    const fetchListing = async () => {
        const { data, error } = await supabase
            .from("listings")
            .select("*, listing_images(*)")
            .eq("id", editId)
            .single();

        if (error) {
            console.error("Error loading listing:", error);
            setErrorMsg("Ошибка загрузки объявления");
            setLoading(false);
            return;
        }

        if (data) {
            setTitle(data.title || "");
            setDescription(data.description || "");
            setPrice(data.price?.toString() || "");
            setLocation(data.location_text || "");
            setContacts(data.contacts || "");
            setListingType(data.type || "buy");
            setCategoryKey(data.category_key || "kids");
            setCondition(data.condition || "new");
            setIsBarter(data.parameters?.barter || false);
            setParameters(data.parameters || {});
            
            if (data.latitude && data.longitude) {
                setCoordinates({ lat: data.latitude, lng: data.longitude });
            }

            // Images
            if (data.listing_images && data.listing_images.length > 0) {
                const loadedImages = data.listing_images.map(img => ({
                    type: 'existing',
                    id: img.id,
                    url: supabase.storage.from('listing-images').getPublicUrl(img.image_path).data.publicUrl,
                    path: img.image_path
                }));
                setImages(loadedImages);
                setInitialImageIds(loadedImages.map(img => img.id));
            }
        }
        setLoading(false);
    };

    fetchListing();
  }, [editId]);

  // добавление файлов из input / dnd
  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const limit = 10;
    const spaceLeft = Math.max(limit - images.length, 0);
    if (spaceLeft <= 0) return;

    const toAdd = incoming.slice(0, spaceLeft);

    toAdd.forEach((file) => {
      // Auto-Moderation for Images
      const check = checkImage(file);
      if (!check.safe) {
          alert(`Ошибка загрузки файла ${file.name}: ${check.error}`);
          return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setImages((prev) => [...prev, {
            type: 'new',
            url: event.target.result,
            file: file
        }]);
      };
      reader.readAsDataURL(file);
    });
  }

  function handleRemoveImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDrop(e) {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }

  function handleFileChange(e) {
    addFiles(e.target.files);
  }

  async function handleGeocode() {
    if (!location.trim()) return;
    setGeocoding(true);
    try {
      const coords = await geocodeAddress(location);
      if (coords) {
        setCoordinates(coords);
      } else {
        alert("Не удалось определить координаты. Попробуйте уточнить адрес.");
      }
    } catch (e) {
      console.error("Geocoding error:", e);
      alert("Ошибка при определении координат.");
    } finally {
      setGeocoding(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setErrorMsg("");
    setSuccessMsg("");

    // Auto-Moderation for Text
    const contentCheck = checkContent(title + " " + description);
    if (!contentCheck.safe) {
        setErrorMsg(`Объявление содержит недопустимые слова: ${contentCheck.flagged.join(", ")}`);
        return;
    }

    // Validate title
    const titleValidation = validateTitle(title);
    if (!titleValidation.valid) {
        setErrorMsg(titleValidation.error);
        return;
    }

    // Check for emojis in title
    if (hasEmoji(title)) {
        setErrorMsg("Эмодзи в заголовке запрещены. Используйте только текст.");
        return;
    }

    // Validate description
    const descValidation = validateDescription(description);
    if (!descValidation.valid) {
        setErrorMsg(descValidation.error);
        return;
    }

    // Validate price
    const priceValidation = validatePrice(price, listingType);
    if (!priceValidation.valid) {
        setErrorMsg(priceValidation.error);
        return;
    }

    if (!contacts.trim()) {
      setErrorMsg("Укажите способ связи (телефон или Telegram).");
      return;
    }

    setLoading(true);

    try {
      // 0. Проверка авторизации и авто-логин если нужно
      const { data: { session } } = await supabase.auth.getSession();
      const tgUser = getTelegramUser();

      if (!session) {
          console.log("⚠️ [Create Listing] No active session. Attempting to restore...");
          if (tgUser && window.Telegram?.WebApp?.initData) {
               try {
                   const res = await fetch("/api/auth/tg/verify", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ initData: window.Telegram.WebApp.initData }),
                   });
                   
                   if (res.ok) {
                       const { token } = await res.json();
                       // Устанавливаем сессию
                       const { error } = await supabase.auth.setSession({
                           access_token: token,
                           refresh_token: token, // Используем тот же токен как refresh (если поддерживается)
                       });
                       if (error) throw error;
                       console.log("✅ [Create Listing] Session restored");
                   } else {
                       throw new Error("Auth failed");
                   }
               } catch (e) {
                   console.error("❌ [Create Listing] Auth failed:", e);
                   setErrorMsg("Ошибка авторизации. Попробуйте обновить страницу.");
                   setLoading(false);
                   return;
               }
           } else {
               setErrorMsg("Войдите в систему, чтобы создать объявление.");
               setLoading(false);
               return;
           }
      }

      // Rate limiting: Check how many listings user created recently
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !editId) { // Skip rate limit check when editing
          const now = new Date();
          const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
          const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

          // Check listings in last hour
          const { data: recentListings, error: recentError } = await supabase
              .from("listings")
              .select("id, created_at")
              .eq("created_by", user.id)
              .gte("created_at", oneHourAgo.toISOString());

          if (recentError) {
              console.error("Error checking rate limit:", recentError);
          } else if (recentListings && recentListings.length >= 3) {
              setErrorMsg("Вы создали слишком много объявлений за последний час. Подождите немного.");
              setLoading(false);
              return;
          }

          // Check listings in last day
          const { data: dailyListings, error: dailyError } = await supabase
              .from("listings")
              .select("id")
              .eq("created_by", user.id)
              .gte("created_at", oneDayAgo.toISOString());

          if (dailyError) {
              console.error("Error checking daily limit:", dailyError);
          } else if (dailyListings && dailyListings.length >= 10) {
              setErrorMsg("Вы достигли дневного лимита объявлений (10 в день). Попробуйте завтра.");
              setLoading(false);
              return;
          }
      }
      const dbType = listingType;

      // данные телеграма для личного кабинета
      let profileId = null;

      if (tgUser?.id) {
          // 1. Проверяем, есть ли профиль
          let { data: existingProfile, error: selectError } = await supabase
              .from("profiles")
              .select("id")
              .eq("tg_user_id", tgUser.id)
              .maybeSingle();

          if (existingProfile) {
              profileId = existingProfile.id;
              console.log("✅ [Create Listing] Found existing profile:", profileId);
          } else {
              // 2. Если нет, создаем
              console.log("📝 [Create Listing] Creating new profile for tg_user_id:", tgUser.id);
              const { data: newProfile, error: createProfileError } = await supabase
                  .from("profiles")
                  .insert({
                      tg_user_id: tgUser.id,
                      tg_username: tgUser.username || null,
                      full_name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || null,
                  })
                  .select("id")
                  .maybeSingle();
              
              if (createProfileError) {
                  console.error("❌ [Create Listing] Ошибка создания профиля:", createProfileError);
                  
                  // Если ошибка уникальности, попробуем найти профиль еще раз
                  if (createProfileError.code === '23505') {
                      console.log("🔄 [Create Listing] Unique constraint error, retrying select...");
                      const { data: retryProfile } = await supabase
                          .from("profiles")
                          .select("id")
                          .eq("tg_user_id", tgUser.id)
                          .maybeSingle();
                      
                      if (retryProfile) {
                          profileId = retryProfile.id;
                          console.log("✅ [Create Listing] Found profile on retry:", profileId);
                      } else {
                          setErrorMsg("Не удалось создать профиль. Попробуйте перезагрузить страницу.");
                          return;
                      }
                  } else {
                      setErrorMsg(`Ошибка создания профиля: ${createProfileError.message}`);
                      return;
                  }
              } else {
                  profileId = newProfile?.id;
                  console.log("✅ [Create Listing] Created new profile:", profileId);
              }
          }
      }

      console.log("🔍 [Create Listing] Resolved profileId:", profileId);
      console.log("🔍 [Create Listing] Telegram User:", tgUser);

      if (!profileId) {
        console.error("❌ [Create Listing] No profileId - cannot create listing");
        setErrorMsg("Не удалось определить ваш профиль. Попробуйте перезагрузить страницу.");
        return;
      }

      // Собираем параметры, добавляем бартер
      const finalParameters = { ...parameters };
      if (isBarter) {
        finalParameters.barter = true;
      }

      let listing;
      let listingError;

      if (editId) {
        // Режим редактирования - обновляем существующее объявление
        console.log("📝 [Edit Listing] Updating listing:", editId);
        
        const { data, error } = await supabase
          .from("listings")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            price: price ? Number(price) : null,
            location_text: location.trim() || null,
            contacts: contacts.trim() || "EMPTY",
            type: dbType,
            category_key: categoryKey || null,
            condition: condition,
            parameters: finalParameters,
            latitude: coordinates?.lat || null,
            longitude: coordinates?.lng || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editId)
          .select()
          .single();
        
        listing = data;
        listingError = error;
      } else {
        // Режим создания - создаём новое объявление
        console.log("📝 [Create Listing] Creating listing with created_by:", profileId);
        
        const { data, error } = await supabase
          .from("listings")
          .insert({
            title: title.trim(),
            description: description.trim() || null,
            price: price ? Number(price) : null,
            location_text: location.trim() || null,
            contacts: contacts.trim() || "EMPTY",
            type: dbType,
            category_key: categoryKey || null,
            created_by: profileId,
            condition: condition,
            parameters: finalParameters,
            latitude: coordinates?.lat || null,
            longitude: coordinates?.lng || null,
          })
          .select()
          .single();
        
        listing = data;
        listingError = error;
      }

      if (listingError) {
        console.error(editId ? "❌ [Edit Listing] Ошибка обновления объявления:" : "❌ [Create Listing] Ошибка вставки объявления:", listingError);
        setErrorMsg(`Ошибка при сохранении: ${listingError.message} (${listingError.details || "no details"})`);
        return;
      }

      console.log(editId ? "✅ [Edit Listing] Listing updated successfully:" : "✅ [Create Listing] Listing created successfully:", listing);
      console.log("📋 [Listing] Listing ID:", listing?.id);

      // --- ОБРАБОТКА ИЗОБРАЖЕНИЙ ---
      if (listing) {
        const listingId = listing.id;
        let mainImagePath = null;
        let hadUploadError = false;

        // 1. Удаление изображений (только для редактирования)
        if (editId) {
            const currentExistingIds = images
                .filter(img => img.type === 'existing')
                .map(img => img.id);
            
            const idsToDelete = initialImageIds.filter(id => !currentExistingIds.includes(id));
            
            if (idsToDelete.length > 0) {
                console.log("🗑️ Deleting images:", idsToDelete);
                // Удаляем из БД
                const { error: deleteError } = await supabase
                    .from('listing_images')
                    .delete()
                    .in('id', idsToDelete);
                
                if (deleteError) console.error("Error deleting images from DB:", deleteError);
                
                // Удаляем файлы из Storage (опционально, можно оставить для истории или чистить кроном)
                // Для простоты пока не удаляем файлы физически, чтобы не сломать если что-то пойдет не так
            }
        }

        // 2. Загрузка новых и обновление позиций
        for (let index = 0; index < images.length; index++) {
            const img = images[index];
            let filePath = img.path;

            if (img.type === 'new') {
                const file = img.file;
                const ext = file.name && file.name.includes(".") ? file.name.split(".").pop() : "jpg";
                const fileName = `${listingId}-${Date.now()}-${index}.${ext}`; // Unique name
                filePath = `listing-${listingId}/${fileName}`;

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
                
                // Создаем запись в БД для нового фото
                await supabase.from('listing_images').insert({
                    listing_id: listingId,
                    file_path: filePath,
                    position: index
                });
            } else {
                // Обновляем позицию для существующего фото
                await supabase.from('listing_images')
                    .update({ position: index })
                    .eq('id', img.id);
            }

            if (index === 0) mainImagePath = filePath;
        }

        // Обновляем main_image_path
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

      setSuccessMsg(editId ? "Объявление успешно обновлено!" : "Объявление успешно опубликовано!");

      setTitle("");
      setDescription("");
      setPrice("");
      setLocation("");
      setContacts("");
      setImageFiles([]);
      setImagePreviews([]);
      setListingType("buy");
      setCategoryKey(CATEGORY_DEFS[0]?.key || "kids");
      setParameters({});
      setCondition("new");
      setIsBarter(false);

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

  // Рендер динамических полей
  const currentCategory = CATEGORY_DEFS.find((c) => c.key === categoryKey);
  const categoryFilters = currentCategory?.filters || [];

  const renderDynamicField = (filter) => {
    // Пропускаем condition, так как оно общее (если нужно, можно сделать специфичным, но пока общее)
    if (filter.key === "condition") return null;
    
    // Пропускаем материал и производитель для услуг
    if (listingType === "service" && (filter.key === "material" || filter.key === "manufacturer")) {
      return null;
    }


    const label = filter.label[lang] || filter.label.ru;
    const value = parameters[filter.key] || "";

    if (filter.type === "select") {
      return (
        <div key={filter.key} className="mb-3">
          <div className="text-[11px] font-semibold mb-1">{label}</div>
          <select
            className="w-full border border-black rounded-xl px-3 py-2 text-sm bg-white"
            value={value}
            onChange={(e) =>
              setParameters({ ...parameters, [filter.key]: e.target.value })
            }
          >
            <option value="">-</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label[lang] || opt.label.ru}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (filter.type === "boolean") {
      return (
        <div key={filter.key} className="mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            id={`param-${filter.key}`}
            checked={!!value}
            onChange={(e) =>
              setParameters({ ...parameters, [filter.key]: e.target.checked })
            }
            className="w-4 h-4"
          />
          <label htmlFor={`param-${filter.key}`} className="text-sm">
            {label}
          </label>
        </div>
      );
    }

    if (filter.type === "range") {
        // Для создания объявления range обычно означает одно числовое поле (например, пробег)
        // Или два поля? В контексте создания обычно вводится конкретное значение.
        // Но в фильтрах это range.
        // Если это "Пробег", то при создании это одно число.
        // Если это "Зарплата", то при создании это может быть одно число или диапазон?
        // Для простоты будем считать, что при создании вводится одно значение.
        return (
            <div key={filter.key} className="mb-3">
              <div className="text-[11px] font-semibold mb-1">{label}</div>
              <input
                type="number"
                className="w-full border border-black rounded-xl px-3 py-2 text-sm"
                value={value}
                onChange={(e) =>
                  setParameters({ ...parameters, [filter.key]: e.target.value })
                }
              />
            </div>
          );
    }

    // text, number
    return (
      <div key={filter.key} className="mb-3">
        <div className="text-[11px] font-semibold mb-1">{label}</div>
        <input
          type={filter.type === "number" ? "number" : "text"}
          className="w-full border border-black rounded-xl px-3 py-2 text-sm"
          value={value}
          onChange={(e) =>
            setParameters({ ...parameters, [filter.key]: e.target.value })
          }
        />
      </div>
    );
  };

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
      <div className="mb-3">
          <BackButton />
      </div>
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

        {/* Бартер */}
        <div className="mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="barter-check"
            checked={isBarter}
            onChange={(e) => setIsBarter(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="barter-check" className="text-sm">
            Возможен обмен (Бартер)
          </label>
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
          
          {/* Опциональная кнопка геокодирования */}
          {location && (
            <button
              type="button"
              onClick={handleGeocode}
              disabled={geocoding}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 flex items-center gap-1"
            >
              📍 {geocoding ? 'Определяю координаты...' : coordinates ? '✓ Координаты определены' : 'Определить точное местоположение'}
            </button>
          )}
        </div>

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
          {inTelegram && (
            <button
              type="button"
              className="mt-2 text-xs text-blue-600 hover:text-blue-800"
              onClick={() => {
                const user = getTelegramUser();
                if (user?.username) {
                  setContacts(`@${user.username}`);
                } else {
                    alert("У вас не установлен username в Telegram.");
                }
              }}
            >
              Использовать мой юзернейм
            </button>
          )}
        </div>

        {/* Состояние (только для товаров, не для услуг) */}
        {listingType !== "service" && (
        <div className="mb-3">
          <div className="text-[11px] font-semibold mb-1">Состояние</div>
          <select
            className="w-full border border-black rounded-xl px-3 py-2 text-sm bg-white"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
             <option value="new">Новое</option>
             <option value="used">Б/у</option>
             <option value="like_new">Как новое</option>
          </select>
        </div>
        )}

        {/* Динамические поля категории */}
        {categoryFilters.map(renderDynamicField)}

        {/* зона фото – много фото */}
        <div
          className="mt-2 border border-dashed border-black rounded-2xl px-4 py-4 text-xs text-center cursor-pointer bg-white"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <label className="flex flex-col items-center justify-center gap-2 cursor-pointer">
            {images.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={img.url}
                      alt={`Предпросмотр ${idx + 1}`}
                      className="h-24 w-24 rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      className="absolute -top-1 -right-1 bg-black text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleRemoveImage(idx);
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
