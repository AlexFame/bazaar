"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import { CATEGORY_DEFS } from "@/lib/categories";
import { getTelegramUser, isTelegramEnv, checkTelegramAccountAge, getUserId } from "@/lib/telegram";
import { geocodeAddress, getUserLocation, reverseGeocode } from "@/lib/geocoding";
import BackButton from "@/components/BackButton";
import ListingCard from "./ListingCard"; 
import { CreateListingSkeleton } from "./SkeletonLoader";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { checkContent, checkImage, hasEmoji, validateTitle, validateDescription, validatePrice } from "@/lib/moderation";
import { calculateQuality } from "@/lib/quality"; // NEW

import imageCompression from 'browser-image-compression';
import { useHaptic } from "@/hooks/useHaptic";
import { triggerConfetti } from "@/lib/confetti";
import { toast } from "sonner";

const typeOptions = [
  { value: "buy", labelKey: "field_type_buy" },
  { value: "sell", labelKey: "field_type_sell" },
  { value: "service", labelKey: "field_type_services" },
  { value: "free", labelKey: "field_type_free" },
];

export default function CreateListingClient({ onCreated, editId }) {
  const router = useRouter();
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
  const { notificationOccurred, impactOccurred } = useHaptic();
  

  const [isSuccessScreen, setIsSuccessScreen] = useState(false); // Success state
  
  // Quality Score
  const [quality, setQuality] = useState({ score: 0, breakdown: [] });
  
  useEffect(() => {
    const q = calculateQuality({
        title: title || "",
        description: description || "",
        price: price || 0,
        location: location || "",
        contacts: contacts || "",
        images: images || []
    });
    setQuality(q);
  }, [title, description, price, location, contacts, images]);

  useEffect(() => {
    if (!editId) return;

    async function loadListing() {
      try {
        setLoading(true);
        
        let listingData = null;
        const tg = window.Telegram?.WebApp;
        const initData = tg?.initData;

        // 1. Try Secure API (Priority for Telegram WebApp)
        if (initData) {
            try {
                const res = await fetch("/api/listings/get", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: editId, initData })
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.listing) {
                        listingData = json.listing;
                        // Map images from relation if available
                        // .. handled in API sort, just mapped below
                    }
                }
            } catch (e) {
                console.error("Secure load failed, falling back", e);
            }
        }

        // 2. Fallback to Supabase Client (for Web/Dev)
        if (!listingData) {
            const { data, error } = await supabase
            .from("listings")
            .select("*, listing_images(*)")
            .eq("id", editId)
            .single();

            if (error) {
                console.error("Error loading listing:", error);
                alert("Ошибка загрузки объявления");
                return;
            }
            listingData = data;
        }

        if (listingData) {
          setTitle(listingData.title);
          setDescription(listingData.description);
          setPrice(listingData.price?.toString() || "");
          setCategoryKey(listingData.category_key || "kids");
          setListingType(listingData.type || "buy");
          setCondition(listingData.condition || "new");
          setLocation(listingData.location_text || "");
          if (listingData.latitude && listingData.longitude) {
            setCoordinates({
              lat: listingData.latitude,
              lng: listingData.longitude,
            });
          }
          setContacts(listingData.contacts || "");
          setParameters(listingData.parameters || {});
          setIsBarter(listingData.parameters?.barter || false);

          // Load images
          if (listingData.listing_images && listingData.listing_images.length > 0) {
            const loaded = listingData.listing_images
              .sort((a,b) => a.position - b.position)
              .map((img) => ({
                id: img.id,
                url: null, // Will be generated
                path: img.file_path,
                type: "existing",
              }));
            
            // Generate public URLs
            const resolved = loaded.map(img => {
                const { data } = supabase.storage.from("listing-images").getPublicUrl(img.path);
                return { ...img, url: data.publicUrl };
            });
            setImages(resolved);
          } else if (listingData.image_path) {
                // Fallback: if no relation images, use main_image_path (Legacy support)
                let url = listingData.image_path;
                // If it's a relative path (not starting with http), get public URL
                if (!url.startsWith('http')) {
                    const { data: publicData } = supabase.storage.from('listing-images').getPublicUrl(url);
                    url = publicData.publicUrl;
                }
                setImages([{
                    type: 'existing',
                    id: 'legacy-main',
                    url: url,
                    path: listingData.image_path
                }]);
          }
        }
      } catch (err) {
        console.error("Unexpected error fetching listing:", err);
        // setErrorMsg("Произошла ошибка при загрузке объявления.");
        alert("Произошла ошибка при загрузке объявления.");
      } finally {
        setLoading(false);
      }
    }

    loadListing();
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
          fileType: 'image/jpeg'
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
    if (loading) return;

      const accountAgeCheck = checkTelegramAccountAge();
      if (!accountAgeCheck.allowed) {
        alert(accountAgeCheck.reason || "Ваш аккаунт Telegram слишком новый.");
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
          if (img.type === 'existing') continue;
          if (!checkImage(img.file)) {
              alert(`Файл ${img.file.name} слишком большой или имеет недопустимый формат.`);
              return;
          }
      }

      setLoading(true);

      try {
        const user = getTelegramUser();
        const tgUserId = getUserId();

        if (!tgUserId) {
          alert("Ошибка авторизации. Попробуйте перезагрузить страницу.");
          setLoading(false);
          return;
        }

        // Get profile UUID from database using Telegram ID
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("tg_user_id", tgUserId)
          .single();

        if (profileError || !profile) {
          alert("Профиль не найден. Пожалуйста, войдите через Telegram.");
          setLoading(false);
          return;
        }

        const userId = profile.id;
        // Generate a UUID for the listing safely (fallback for old environments)
        const generateUUID = () => {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return crypto.randomUUID();
            }
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };
        const listingId = generateUUID();

      // 1. Upload images
      const uploadedPaths = [];
      
      // We also want to insert into listing_images table for robustness
      const listingImagesInserts = [];

      for (const [index, img] of images.entries()) {
        if (img.type === 'existing') {
             // For existing images, we don't move them, but we might want to ensure they are tracked?
             // Actually, if we are editing, we are not creating new listingId.
             // WAIT! editId is handled separately?
             // If editId exists, we use it. If not, generate new.
             continue;
        }

        const currentId = editId || listingId;
        const fileExt = img.file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const folderName = `listing-${currentId}`;
        const filePath = `${folderName}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(filePath, img.file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }
        
        uploadedPaths.push(filePath);
        
        listingImagesInserts.push({
            listing_id: currentId,
            file_path: filePath,
            position: index
        });
      }

      // 2. Insert or Update listing
      // 2. Insert or Update listing via Secure API
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData;
      if (!initData) throw new Error("InitData missing");

      const payload = {
        title,
        description,
        price: Number(price),
        category_key: categoryKey,
        type: listingType,
        condition: listingType === "service" ? "new" : condition,
        main_image_path: uploadedPaths[0] || (images.find(i => i.type === 'existing')?.path) || null,
        location_text: location,
        latitude: coordinates?.lat || null,
        longitude: coordinates?.lng || null,
        contacts: contacts || "",
        // created_by is handled by server from initData
        parameters: parameters, 
        status: status,
        id: editId || listingId // Pass ID for update or insert
      };

      const res = await fetch('/api/listings/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, initData })
      });

      if (!res.ok) {
          const dat = await res.json();
          throw new Error(dat.error || "Save failed");
      }


      // 3. Update listing_images table
      // First, delete OLD images to prevent duplication/ghosting
      // (We use a full replace strategy for simplicity and correctness)
      const currentId = editId || listingId;
      
      const { error: deleteError } = await supabase
          .from("listing_images")
          .delete()
          .eq("listing_id", currentId);

      if (deleteError) {
          console.error("Error clearing old images:", deleteError);
          // Proceeding anyway might be risky, but let's try to insert new ones.
      }

      if (listingImagesInserts.length > 0) {
          const { error: imgError } = await supabase.from("listing_images").insert(listingImagesInserts);
          if (imgError) console.error("Error inserting listing_images:", imgError);
      }

      // Error checking was done inside the blocks above.


      if (status === 'draft') {
        toast.success("Объявление сохранено в черновики!");
        notificationOccurred('success');
        setTimeout(() => router.push("/"), 2000);
      } else {
        if (editId) {
             // EDIT CASE: Toast only, no confetti
             toast.success("Объявление отредактировано! ✅", {
                 description: "Возвращаемся к объявлению..."
             });
             notificationOccurred('success');
             
             // Redirect back to listing after delay
             setTimeout(() => {
                 router.push(`/listing/${editId}`);
             }, 1500);
        } else {
             // CREATE CASE: Confetti + Success Screen
             triggerConfetti();
             notificationOccurred('success');
             setIsSuccessScreen(true);
             // Auto-redirect after delay (optional, but good UX)
             setTimeout(() => {
                 router.refresh();
                 router.push("/");
             }, 3000);
        }
      } 
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

    // --- Conditional Logic for Electronics ---
    if (categoryKey === "electronics" && (filter.key === "memory" || filter.key === "ram")) {
      const allowedSubtypes = ["mobile_phones", "laptops", "tablets", "desktops"];
      const currentSubtype = parameters["subtype"];
      if (!allowedSubtypes.includes(currentSubtype)) {
        return null;
      }
    }

    // --- Conditional Logic for Sizes (Kids & Fashion) ---
    if ((categoryKey === "kids" || categoryKey === "fashion") && (filter.key === "size_clothes" || filter.key === "size_shoes")) {
      const currentSubtype = parameters["subtype"];
      // If clothing, hide shoes size. If shoes, hide clothing size.
      // If neither (e.g. accessories), hide both.
      if (filter.key === "size_clothes" && currentSubtype !== "clothing") return null;
      if (filter.key === "size_shoes" && currentSubtype !== "shoes") return null;
    }

    // --- Conditional Logic for Realty ---
    if (categoryKey === "realty" && (filter.key === "deposit" || filter.key === "utilities_included")) {
      const currentDealType = parameters["deal_type"];
      // Show only if deal type is rent or daily
      if (currentDealType !== "rent" && currentDealType !== "daily") {
        return null;
      }
    }


    const label = filter.label[lang] || filter.label.ru;
    const value = parameters[filter.key] || "";

      // select
      if (filter.type === "select") {
        return (
          <div key={filter.key} className="mb-3">
            <div className="text-[11px] font-semibold mb-1 dark:text-gray-300">{label}</div>
            <div className="relative">
              <select
                className="w-full border border-black dark:border-white/20 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-foreground dark:text-white appearance-none"
                value={value}
                onChange={(e) =>
                  setParameters({ ...parameters, [filter.key]: e.target.value })
                }
              >
                <option value="">{t("select_option") || "Выбрать"}</option>
                {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[lang] || opt.label.ru}
                    </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
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
              <div className="text-[11px] font-semibold mb-1 dark:text-gray-300">{label}</div>
              <input
                type="number"
                className="w-full border border-black dark:border-white/20 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-foreground dark:text-white"
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
        <div className="text-[11px] font-semibold mb-1 dark:text-gray-300">{label}</div>
        <input
          type={filter.type === "number" ? "number" : "text"}
          className="w-full border border-black dark:border-white/20 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-foreground dark:text-white"
          value={value}
          onChange={(e) =>
            setParameters({ ...parameters, [filter.key]: e.target.value })
          }
        />
      </div>
    );
  };


  if (loading) {
     // We will handle loading in the main return to ensure hooks consistency
  }

  // Define content variables instead of early returns
  const renderContent = () => {
    if (loading) return <CreateListingSkeleton />;
    
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
    
    if (isSuccessScreen) {
        return (
          <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-6 text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
              </div>
              <h1 className="text-2xl font-bold mb-2 dark:text-white">
                  {t("congrats") || "Поздравляем!"}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                  {t("listing_published") || "Ваше объявление опубликовано!"}
              </p>
              
              <button 
                  onClick={() => {
                      // Force refresh to show new listing
                      router.refresh();
                      setTimeout(() => router.push('/'), 100);
                  }}
                  className="w-full max-w-xs py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium"
              >
                  {t("go_home") || "На главную"}
              </button>
          </div>
        );
    }

    return null; // Main form will be rendered if null
  };
  
  const specialStateContent = renderContent();


  if (specialStateContent) {
      return specialStateContent;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md px-4 py-4 border-b border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-2xl font-bold mb-4 dark:text-white text-center">{t(editId ? "create_title_edit" : "create_title")}</h1>
        </div>
      </div>

      <div className="w-full max-w-xl mx-auto mt-4 px-3">

      <div className="flex items-center justify-between mb-2">
         <h1 className="text-lg font-semibold dark:text-white">{t("new_heading")}</h1>
         {/* Quality Indicator */}
         {inTelegram && (
             <div className="flex flex-col items-end">
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">{t('quality_score')}</span>
                    <span className={`text-sm font-bold ${
                        quality.score < 40 ? 'text-red-500' : 
                        quality.score < 75 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                        {quality.score}%
                    </span>
                 </div>
                 <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mt-1">
                     <div 
                        className={`h-full transition-all duration-500 ${
                            quality.score < 40 ? 'bg-red-500' : 
                            quality.score < 75 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${quality.score}%` }}
                     />
                 </div>
             </div>
         )}
      </div>

      {errorMsg && (
        <div className="mb-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl px-3 py-2">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="mb-2 text-xs text-green-700 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-xl px-3 py-2">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#F2F3F7] dark:bg-white/5 rounded-2xl p-3 border border-transparent dark:border-white/10">
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
              className="w-full border border-black dark:border-white/20 rounded-xl px-3 py-2 text-xs flex items-center justify-between bg-white dark:bg-card text-foreground"
            >
              <span>
                {t(typeOptions.find((o) => o.value === listingType).labelKey)}
              </span>
              <span className="text-[10px]">▼</span>
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 mt-2 w-44 bg-white dark:bg-neutral-900 border border-black dark:border-white/20 rounded-xl shadow-lg z-20 text-xs">
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
                        if (opt.value === 'free') {
                            setPrice("0");
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
          <div className="text-[11px] font-semibold mb-1 dark:text-gray-300">
            {t("field_category_label")}
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_DEFS.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategoryKey(cat.key)}
                className={`px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                  categoryKey === cat.key
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                    : "bg-white text-black border-black/10 dark:bg-white/5 dark:text-gray-200 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30"
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
          <div className="text-[11px] font-semibold mb-1 dark:text-gray-300">
            {t("field_title_label")}
          </div>
          <input
            type="text"
            placeholder={t("field_title_ph")}
            className="w-full border border-black dark:border-white/20 bg-white dark:bg-neutral-900 text-foreground dark:text-white rounded-xl px-3 py-2 text-sm placeholder-gray-500 dark:placeholder-gray-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* описание */}
        <div className="mb-3">
          <div className="text-[11px] font-semibold mb-1 dark:text-gray-300">
            {t("field_desc_label")}
          </div>
          <textarea
            rows={4}
            placeholder={t("field_desc_ph")}
            className="w-full border border-black dark:border-white/20 bg-white dark:bg-neutral-900 text-foreground dark:text-white rounded-xl px-3 py-2 text-sm resize-none placeholder-gray-500 dark:placeholder-gray-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* цена (Скрываем для типа 'free' / 'give_away') */}
        {listingType !== 'free' && (
          <div className="mb-3">
            <div className="text-[11px] font-semibold mb-1 dark:text-gray-300">
              {t("field_price_label")}
            </div>
            <input
              type="number"
              min="0"
              placeholder={t("field_price_ph")}
              className="w-full border border-black dark:border-white/20 bg-white dark:bg-neutral-900 text-foreground dark:text-white rounded-xl px-3 py-2 text-sm placeholder-gray-500 dark:placeholder-gray-500"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        )}

        {/* Бартер */}
        <div className="mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="barter-check"
            checked={isBarter}
            onChange={(e) => setIsBarter(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-neutral-800"
          />
          <label htmlFor="barter-check" className="text-sm dark:text-gray-300">
            {t("barter_label") || "Возможен обмен (Бартер)"}
          </label>
        </div>



        {/* локация */}
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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Контакты */}
        <div className="mb-6">
          <div className="text-[11px] font-semibold mb-1 dark:text-gray-300">
            {t("field_contacts_label")}
          </div>
          <textarea
            rows={2}
            placeholder={t("field_contacts_ph")}
            className="w-full border border-black dark:border-white/20 bg-white dark:bg-neutral-900 text-foreground dark:text-white rounded-xl px-3 py-2 text-sm resize-none placeholder-gray-500 dark:placeholder-gray-500"
            value={contacts}
            onChange={(e) => setContacts(e.target.value)}
          />
          <div className="mt-2">
            {inTelegram && (
                <button
                type="button"
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                onClick={() => {
                    const user = getTelegramUser();
                    if (user?.username) {
                    setContacts(`@${user.username}`);
                    } else {
                        alert("У вас не установлен username в Telegram.");
                    }
                }}
                >
                {t("username_label_use") || "Использовать мой юзернейм"}
                </button>
            )}
          </div>
        </div>

        {/* Состояние (только для товаров, не для услуг) */}
        {listingType !== "service" && (
        <div className="mb-3">
          <div className="text-[11px] font-semibold mb-1 dark:text-gray-300">{t("condition_label") || "Состояние"}</div>
          <div className="relative">
            <select
              className="w-full border border-black dark:border-white/20 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-foreground dark:text-white appearance-none"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
               <option value="new">{t("condition_new")}</option>
               <option value="used">{t("condition_used")}</option>
               <option value="like_new">{t("condition_like_new")}</option>
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
        )}


        {/* Динамические поля категории */}
        {categoryFilters.map(renderDynamicField)}

        {/* зона фото – много фото */}
        <div
          className="w-full mt-2 border border-dashed border-gray-300 dark:border-white/20 rounded-2xl px-4 py-8 text-xs text-center cursor-pointer bg-transparent dark:bg-white/5 text-foreground dark:text-white"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <label className="flex flex-col items-center justify-center gap-2 cursor-pointer">
            {images.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 w-full justify-items-center">
                {images.map((img, idx) => (
                  // Legacy Aspect Ratio Hack (padding-bottom 100%)
                  <div key={idx} className="relative w-full" style={{ paddingBottom: '100%' }}>
                    <img
                      src={img.url}
                      alt={`Предпросмотр ${idx + 1}`}
                      className="absolute inset-0 w-full h-full rounded-xl object-cover border border-gray-100 dark:border-white/10"
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
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="text-xs font-semibold dark:text-gray-200">{t("upload_photos_label") || "Загрузите фото"}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">{t("field_photos_ph") || "до 10 шт"}</div>
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
      </div> 
    </div>
  );
}
