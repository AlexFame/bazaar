"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import { CATEGORY_DEFS } from "@/lib/categories";
import { getTelegramUser, isTelegramEnv, checkTelegramAccountAge, getUserId } from "@/lib/telegram";
import { geocodeAddress, getUserLocation, reverseGeocode } from "@/lib/geocoding";
import BackButton from "@/components/BackButton";

import { checkContent, checkImage, hasEmoji, validateTitle, validateDescription, validatePrice } from "@/lib/moderation";
import imageCompression from 'browser-image-compression';

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
  const [honeypot, setHoneypot] = useState(""); // Bot trap
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
  async function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const limit = 10;
    const spaceLeft = Math.max(limit - images.length, 0);
    if (spaceLeft <= 0) return;

    const toAdd = incoming.slice(0, spaceLeft);

    for (const file of toAdd) {
      // Auto-Moderation for Images
      const check = checkImage(file);
      if (!check.safe) {
          alert(`Ошибка загрузки файла ${file.name}: ${check.error}`);
          continue;
      }

      try {
        console.log(`Compressing ${file.name}...`);
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/webp'
        };
        
        const compressedFile = await imageCompression(file, options);
        console.log(`Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

        const reader = new FileReader();
        reader.onload = (event) => {
          setImages((prev) => [...prev, {
              type: 'new',
              url: event.target.result,
              file: compressedFile
          }]);
        };
        reader.readAsDataURL(compressedFile);

      } catch (error) {
        console.error("Image compression error:", error);
        // Fallback to original
        const reader = new FileReader();
        reader.onload = (event) => {
          setImages((prev) => [...prev, {
              type: 'new',
              url: event.target.result,
              file: file
          }]);
        };
        reader.readAsDataURL(file);
      }
    }
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

  async function handleAutoLocation() {
    setGeocoding(true);
    try {
      // 1. Get coordinates
      const coords = await getUserLocation();
      if (!coords) {
        alert("Не удалось получить доступ к геолокации. Проверьте настройки браузера.");
        return;
      }

      setCoordinates(coords);

      // 2. Reverse geocode to get address text
      const address = await reverseGeocode(coords.lat, coords.lng);
      if (address) {
        setLocation(address);
      } else {
        // If address is found, use it. If not, try to format it better or just use coords but maybe with a warning?
        // Actually, let's try to be more persistent or just use what we have.
        // The user wants "City name", so reverseGeocode is key.
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

  async function handleSubmit(e, status = 'active') {
    if (e) e.preventDefault();

    if (!checkTelegramAccountAge()) {
      alert("Ваш аккаунт Telegram слишком новый для публикации объявлений.");
      return;
    }

    // Basic validation
    if (!title.trim() || !price.trim()) {
      alert("Заполните обязательные поля (Заголовок, Цена)");
      return;
    }

    // Content moderation
    if (!checkContent(title) || !checkContent(description)) {
      alert("Ваше объявление содержит запрещенные слова.");
      return;
    }

    if (hasEmoji(title)) {
      alert("В заголовке нельзя использовать эмодзи.");
      return;
    }

    if (!validateTitle(title)) {
        alert("Заголовок слишком короткий (минимум 3 символа).");
        return;
    }

    if (!validateDescription(description)) {
        alert("Описание слишком короткое (минимум 10 символов).");
        return;
    }

    if (!validatePrice(price)) {
        alert("Цена указана некорректно.");
        return;
    }

    // Image moderation
    for (const img of images) {
        if (!checkImage(img.file)) {
            alert(`Файл ${img.file.name} слишком большой или имеет недопустимый формат.`);
            return;
        }
    }

    setLoading(true);

    try {
      const user = getTelegramUser();
      const userId = getUserId();

      if (!userId) {
        alert("Ошибка авторизации. Попробуйте перезагрузить страницу.");
        setLoading(false);
        return;
      }

      // 1. Upload images
      const uploadedPaths = [];
      for (const img of images) {
        const fileExt = img.file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("listings")
          .upload(filePath, img.file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from("listings")
            .getPublicUrl(filePath);
            
        uploadedPaths.push(publicUrl);
      }

      // 2. Insert listing
      const { error } = await supabase.from("listings").insert({
        title,
        description,
        price: Number(price),
        currency: "UAH",
        category_key: categoryKey,
        type: listingType,
        condition: listingType === "service" ? "new" : condition, // Default for services
        main_image_path: uploadedPaths[0] || null,
        image_path: uploadedPaths, // Array of all images
        location_text: location,
        latitude: coordinates?.lat || null,
        longitude: coordinates?.lng || null,
        created_by: userId,
        parameters: dynamicValues, // JSONB
        status: status // 'active' or 'draft'
      });

      if (error) throw error;

      if (status === 'draft') {
        alert("Объявление сохранено в черновики!");
      } else {
        alert("Объявление опубликовано!");
      }
      
      // Reset form or redirect
      window.location.href = "/"; 
    } catch (err) {
      console.error("Error creating listing:", err);
      alert("Ошибка при создании объявления: " + err.message);
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
        {/* Honeypot field - hidden from users, bots will fill it */}
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        
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
                        // Auto-select Business category if Service type is selected
                        if (opt.value === "service") {
                          setCategoryKey("business");
                        }
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
          <div className="relative">
            <input
              type="text"
              placeholder={t("field_location_ph")}
              className="w-full border border-black rounded-xl px-3 py-2 text-sm pr-10"
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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
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

        <div className="flex gap-2 mt-3">
          <button
            type="button"
            disabled={loading}
            onClick={(e) => handleSubmit(e, 'draft')}
            className="flex-1 bg-white border border-black text-black text-sm rounded-full py-2 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            {loading ? "Сохраняем..." : lang === "ua" ? "До чернетки" : "В черновик"}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-black text-white text-sm rounded-full py-2 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
          >
            {loading ? t("btn_publish") + "..." : t("btn_publish")}
          </button>
        </div>
      </form>
    </section>
  );
}
