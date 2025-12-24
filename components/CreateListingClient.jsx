"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import { CATEGORY_DEFS } from "@/lib/categories";
import { getTelegramUser, isTelegramEnv, checkTelegramAccountAge, getUserId } from "@/lib/telegram";
import BackButton from "@/components/BackButton";
import ListingCard from "./ListingCard"; 
import { CreateListingSkeleton } from "./SkeletonLoader";
import ImageUploader from "@/components/listing/ImageUploader";
import LocationPicker from "@/components/listing/LocationPicker";
import BeforeAfterUploader from "@/components/listing/BeforeAfterUploader"; // NEW

import { checkContent, checkImage, hasEmoji, validateTitle, validateDescription, validatePrice } from "@/lib/moderation";
import { calculateQuality } from "@/lib/quality"; // NEW

import { useHaptic } from "@/hooks/useHaptic";
import { triggerConfetti } from "@/lib/confetti";
import { toast } from "sonner";
import { motion } from "framer-motion"; // Animation

const typeOptions = [
  { value: "buy", labelKey: "field_type_buy" },
  { value: "sell", labelKey: "field_type_sell" },
  { value: "service", labelKey: "field_type_services" },
  { value: "free", labelKey: "field_type_free" },
  { value: "exchange", labelKey: "field_type_exchange" }, // Added as requested
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
  const [listingUuid, setListingUuid] = useState("");
  const [beforeAfterImages, setBeforeAfterImages] = useState({ before: null, after: null }); // NEW
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSavedData, setLastSavedData] = useState(null);
  const [mounted, setMounted] = useState(false); // NEW: Hydration fix
  const [inTelegram, setInTelegram] = useState(false); // NEW: State instead of immediate check

  const { notificationOccurred, impactOccurred } = useHaptic();
  

  const [isSuccessScreen, setIsSuccessScreen] = useState(false); // Success state

  const getSafeLabel = (obj, fallback) => {
    if (typeof obj === 'string') return obj;
    if (!obj || typeof obj !== 'object') return fallback;
    return obj[lang] || obj.ru || obj.en || obj.ua || fallback;
  };
  
  // Quality Score
  const [quality, setQuality] = useState({ score: 0, breakdown: [] });
  
  useEffect(() => {
    setMounted(true);
    setInTelegram(isTelegramEnv());
  }, []);

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
    // Generate UUID if creating new
    if (!editId) {
        const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        setListingUuid(uuid);
    } else {
        setListingUuid(editId);
    }
    
    // Helper to generate UUID
    window.generateNewUuid = () => {
         const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        setListingUuid(uuid);
    };

    if (!editId && !listingUuid) {
        window.generateNewUuid();
    }

    if (!editId) return;

    async function loadListing() {
      try {
        setLoading(true);
        
        let listingData = null;
        const tg = window.Telegram?.WebApp;
        const initData = tg?.initData;

        // 1. Try Secure API
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
                    }
                }
            } catch (e) {
                console.error("Secure load failed, falling back", e);
            }
        }

        // 2. Fallback to Supabase
        if (!listingData) {
           const { data, error } = await supabase
            .from("listings")
            .select("*")
            .eq("id", editId)
            .maybeSingle();
           if (data) listingData = data;
        }

        if (listingData) {
          setTitle(listingData.title || "");
          setDescription(listingData.description || "");
          setPrice(listingData.price?.toString() || "");
          setLocation(listingData.location || "");
          setContacts(listingData.contacts || "");
          setCategoryKey(listingData.category_key || "kids");
          setListingType(listingData.type || "sell");
          setParameters(listingData.filters || {});
          setCondition(listingData.condition || "new");
          if (listingData.before_after_images) {
              setBeforeAfterImages(listingData.before_after_images);
          }
          
          // Images...
          const folder = `listing-${listingData.id}`;
          const { data: files } = await supabase.storage.from("listing-images").list(folder);
          if (files && files.length > 0) {
              const mapped = files.map(f => ({
                  type: 'existing',
                  path: `${folder}/${f.name}`,
                  url: supabase.storage.from('listing-images').getPublicUrl(`${folder}/${f.name}`).data.publicUrl
              }));
              setImages(mapped);
          }
        }
      } catch (err) {
        console.error("Unexpected error fetching listing:", err);
        // setErrorMsg("Произошла ошибка при загрузке объявления.");
        alert(t("error_loading_listing"));
      } finally {
        setLoading(false);
      }
    }

    loadListing();
  }, [editId]);

  // Draft Protection is handled by the auto-save useEffect and saveCurrentDraft below.
  // Reusable Draft Saving Function
  const saveCurrentDraft = async (dataOverride = null) => {
      // Don't save if in edit mode or if we just successfully published
      if (editId || isSuccessScreen) return true; // Treat as success to proceed

      const data = dataOverride || { title, description, price, location, contacts, categoryKey, listingType, parameters, listingUuid };
      
      if (!listingUuid && !data.listingUuid) return false;
      const uuidToUse = data.listingUuid || listingUuid;

      try {
          setIsSavingDraft(true);
          
          const tg = window.Telegram?.WebApp;
          const initData = tg?.initData;
          
          const payload = {
              id: uuidToUse,
              title: data.title || "",
              description: data.description || "",
              price: data.price ? Number(data.price) : 0, 
              category_key: data.categoryKey,
              type: data.listingType,
              location_text: data.location,
              status: 'draft',
              parameters: data.parameters || {},
              updated_at: new Date().toISOString(),
          };
          
          if (initData) {
              const res = await fetch('/api/listings/save', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...payload, initData })
              });
              
              if (!res.ok) {
                  const errText = await res.text();
                  throw new Error(`Server returned ${res.status}: ${errText}`);
              }
          } else {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                  const dbPayload = { 
                      ...payload, 
                      created_by: user.id,
                      location_text: data.location 
                  };
                  const { error } = await supabase.from('listings').upsert(dbPayload);
                  if (error) throw error;
              } else {
                  console.warn("No user for draft save");
                  // If no user, we can't save to DB. 
                  // Return false so we don't clear local storage.
                  return false;
              }
          }
          console.log("Draft synced");
          return true;
      } catch(e) {
          console.error("Draft sync failed", e);
          return false;
      } finally {
          setIsSavingDraft(false);
      }
  };

  useEffect(() => {
    if (editId || loading || isSuccessScreen) return; 
    const draftKey = 'listing_draft_v1';
    
    const saveToLocalStorage = (data) => {
         if (!loading && (data.title || data.description || data.price || data.listingUuid)) {
             localStorage.setItem(draftKey, JSON.stringify(data));
         }
    };

    const handler = setTimeout(() => {
         if (title || description || price || listingUuid) {
            const currentData = { listingUuid, title, description, price, location, contacts, categoryKey, listingType, parameters, timestamp: Date.now() };
            saveToLocalStorage(currentData);
            saveCurrentDraft(currentData);
         }
    }, 500);

    return () => clearTimeout(handler);
  }, [title, description, price, location, contacts, categoryKey, listingType, parameters, editId, listingUuid, loading]);

  const handleBack = async () => {
      if (!editId && (title || description || price)) { 
           setLoading(true);
           const success = await saveCurrentDraft();
           
           if (success) {
               localStorage.removeItem('listing_draft_v1'); 
               toast.success(t("draft_saved") || "Черновик сохранен");
               router.back();
           } else {
               // Failed to save. Do NOT clear local storage.
               // Ask user if they want to exit anyway? or Just exit and rely on LocalStorage?
               // Better: Rely on LocalStorage. The next time they open "Create", restore it.
               // But 'router.back()' might leave them thinking it's saved.
               // Alert them.
               if (window.confirm(t("draft_save_error_exit") || "Не удалось сохранить черновик в облако. Он останется на этом устройстве. Выйти?")) {
                   router.back();
               } else {
                   setLoading(false);
               }
           }
      } else {
          router.back();
      }
  };

  // Restore draft on mount
  useEffect(() => {
    if (editId || !mounted) return;
    const draftKey = 'listing_draft_v1';
    const dismissedKey = 'listing_draft_v1_dismissed';
    
    const saved = localStorage.getItem(draftKey);
    const dismissedAt = localStorage.getItem(dismissedKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.title || parsed.description) {
           // If already dismissed this specific draft (by timestamp), skip
           if (dismissedAt && parsed.timestamp && Number(dismissedAt) >= parsed.timestamp) {
               return;
           }

           if (!title && !description) {
                const message = t("restore_draft") || "Найдено незавершенное объявление. Восстановить?";
                if (window.confirm(message)) {
                    setTitle(parsed.title || "");
                    setDescription(parsed.description || "");
                    setPrice(parsed.price?.toString() || "");
                    setLocation(parsed.location || "");
                    setContacts(parsed.contacts || "");
                    setCategoryKey(parsed.categoryKey || "kids");
                    setListingType(parsed.listingType || "buy");
                    setParameters(parsed.parameters || {});
                    toast.success(t("draft_auto_restored") || "Черновик восстановлен");
                } else {
                    // Mark as dismissed for this specific draft timestamp
                    localStorage.setItem(dismissedKey, parsed.timestamp || Date.now());
                }
           }
        }
      } catch (e) {
          console.error("Draft restoration error", e);
      }
    }
  }, [mounted, editId, t]); // Run only once when mounted and editId is clear

  if (!mounted) {
    return <CreateListingSkeleton />;
  }

  // Image & Location logic moved to sub-components

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
        alert(t("alert_fill_required") || "Заполните обязательные поля (Заголовок, Цена)");
        return;
      }

      // Content moderation
      const contentCheckTitle = checkContent(title);
      const contentCheckDesc = checkContent(description);

      if (!contentCheckTitle.safe || !contentCheckDesc.safe) {
        alert(t("alert_forbidden_content") || "Ваше объявление содержит запрещенные слова.");
        return;
      }

      if (hasEmoji(title)) {
        alert(t("alert_no_emoji") || "В заголовке нельзя использовать эмодзи.");
        return;
      }

      const titleVal = validateTitle(title);
      if (!titleVal.valid) {
          alert(t(titleVal.errorKey));
          return;
      }

      // Check price first as number
      const priceValResult = validatePrice(price, listingType);
      if (!priceValResult.valid) {
          let msg = t(priceValResult.errorKey);
          if (priceValResult.params) {
              Object.entries(priceValResult.params).forEach(([k, v]) => {
                  msg = msg.replace(`{${k}}`, v);
              });
          }
          alert(msg);
          return;
      }

      const descVal = validateDescription(description);
      if (!descVal.valid) {
          alert(t(descVal.errorKey));
          return;
      }

      // Image moderation
      for (const img of images) {
          if (img.type === 'existing') continue;
          const imgCheck = checkImage(img.file);
          if (!imgCheck.safe) {
               // For image errors specifically, we might have params too if we update moderation.js later.
               // For now, if checkImage returns errorKey, use it.
               if (imgCheck.errorKey) {
                   let msg = t(imgCheck.errorKey);
                    if (imgCheck.params) {
                        Object.entries(imgCheck.params).forEach(([k, v]) => {
                            msg = msg.replace(`{${k}}`, v);
                        });
                    }
                   alert(`${img.file.name}: ${msg}`);
               } else {
                   // Fallback for old return format
                   alert(`Файл ${img.file.name}: ${imgCheck.error}`);
               }
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

        // Profile check removed - relying on API authorization
        const userId = "server_will_resolve"; 

        const listingId = listingUuid || generateUUID();

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

      // 2. Prepare Payload (including Images)
      // Collect ALL images (existing + new) in order
      const finalImages = [];
      let pos = 0;
      
      // We need to merge existing images and newly uploaded ones in the correct order as displayed in UI.
      // `images` state contains objects with type 'existing' or 'new'.
      // We iterate `images` array to preserve verified order.
      
      // Helper map for new uploads
      // uploadedPaths is indexed by the loop over `images`. 
      // BUT: the loop skipped 'existing'. So `uploadedPaths` indices do NOT match `images` indices.
      // We need to match them.
      
      let uploadIndex = 0;
      
      for (const img of images) {
         if (img.type === 'existing') {
             finalImages.push({
                 path: img.path,
                 position: pos++
             });
         } else {
             // It's a new image, pull from uploadedPaths
             if (uploadIndex < uploadedPaths.length) {
                 finalImages.push({
                     path: uploadedPaths[uploadIndex],
                     position: pos++
                 });
                 uploadIndex++;
             }
         }
      }

      // 3. Call API
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData;

      // Add before_after_images processing
      let processedBeforeAfter = null;
      
      if (listingType === 'service' && beforeAfterImages.before && beforeAfterImages.after) {
          // Upload logic for these specific files
          // We'll reuse the same storage bucket 'listing-images' but standard procedure.
          // Since they are single files, we can just upload them here.
          
          const uploadSingle = async (imgObj) => {
              if (imgObj.file) {
                 const fileExt = imgObj.file.name.split('.').pop();
                 const uniqueFileName = `${listingId}_ba_${Math.random().toString(36).substring(2)}.${fileExt}`;
                 const { data, error } = await supabase.storage
                    .from('listing-images')
                    .upload(`listing-${editId || listingId}/${uniqueFileName}`, imgObj.file);
                 
                  if (error) throw error;
                  return data.path; 
              }
              return imgObj.path; // If existing (from edit)
          };

          try {
             // Handle 'before'
             const beforePath = await uploadSingle(beforeAfterImages.before);
             // Handle 'after'
             const afterPath = await uploadSingle(beforeAfterImages.after);
             
             processedBeforeAfter = {
                 before: beforePath,
                 after: afterPath
             };

          } catch (e) {
              console.error("Error uploading before/after:", e);
              // Fail gracefully? Or alert?
              // alert("Ошибка загрузки фото до/после");
          }
      }

      const payload = {
        title,
        description,
        price: Number(price),
        category_key: categoryKey,
        type: listingType,
        condition: listingType === "service" ? "new" : condition,
        location_text: location,
        latitude: coordinates?.lat || null,
        longitude: coordinates?.lng || null,
        contacts: contacts || "",
        parameters: Object.entries(parameters).reduce((acc, [key, val]) => {
            // Find definition
            const def = currentCategory?.filters?.find(f => f.key === key);
            if (def && (def.type === 'number' || def.type === 'range') && val !== "") {
                acc[key] = Number(val);
            } else {
                acc[key] = val;
            }
            return acc;
        }, {}), 
        status: status,
        id: editId || listingId,
        // Pass the full image list to be synced by the server
        images: finalImages,
        main_image_path: finalImages.length > 0 ? finalImages[0].path : null,
        before_after_images: processedBeforeAfter
      };
      
      if (initData) {
           // Secure API Call (Telegram)
           const res = await fetch('/api/listings/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...payload, initData })
           });

           if (!res.ok) {
              let errorMsg = "Save failed";
              try {
                  const dat = await res.json();
                  errorMsg = dat.error || errorMsg;
              } catch (parseErr) {
                  // If JSON parse fails, it's likely HTML error page
                  const text = await res.text();
                  console.error("Server returned non-JSON error:", text);
                  errorMsg = `Server Error (${res.status}): ${text.substring(0, 100)}...`;
              }
              throw new Error(errorMsg);
           }
      } else {
           // Fallback: Supabase Client (Web/Dev)
           // RLS must allow this (Policy: "Users can update their own listings")
           const { data: { user } } = await supabase.auth.getUser();
           if (!user) throw new Error("not_logged_in"); // "Not logged in"

           // 1. Save Listing
           // Note: payload.id is set. created_by must match auth.uid()
           const dbPayload = { ...payload, created_by: user.id };
           delete dbPayload.images; // Relations handled separately
           delete dbPayload.main_image_path; // Computed
           
           // Restore main_image_path logic if needed, but DB trigger/logic might handle it?
           // Actually API helper does: "main_image_path: finalImages.length > 0 ? finalImages[0].path : null"
           // We should pass it to DB too.
           dbPayload.main_image_path = payload.main_image_path;
           
           const { error: saveError } = await supabase
               .from('listings')
               .upsert(dbPayload);
           
           if (saveError) throw saveError;

           // 2. Sync Images
           const listingId = payload.id;
           // Delete existing (if RLS allows)
           await supabase.from('listing_images').delete().eq('listing_id', listingId);
           
           // Insert new
           if (payload.images && payload.images.length > 0) {
               const imageRows = payload.images.map(img => ({
                    listing_id: listingId,
                    file_path: img.path,
                    position: img.position
               }));
               const { error: imgError } = await supabase.from('listing_images').insert(imageRows);
               if (imgError) console.error("Image sync error:", imgError);
           }
      }

      // Error checking was done inside the blocks above.


      if (status === 'draft') {
        localStorage.removeItem('listing_draft_v1'); // Clear draft
        toast.success(t("draft_saved") || "Объявление сохранено в черновики!");
        notificationOccurred('success');
        setTimeout(() => router.push("/"), 2000);
      } else {
        if (editId) {
             // EDIT CASE: Toast only, no confetti
             toast.success(t("listing_edited") || "Объявление отредактировано! ✅", {
                 description: t("returning_to_listing") || "Возвращаемся к объявлению..."
             });
             notificationOccurred('success');
             
             // Redirect back to listing after delay
             setTimeout(() => {
                 router.push(`/listing/${editId}`);
             }, 1500);
        } else {
             // CREATE CASE: Confetti + Success Screen
             localStorage.removeItem('listing_draft_v1'); // Clear draft
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

    // --- Conditional Logic for Kids (Brand/Material) ---
    if (categoryKey === "kids") {
         const currentSubtype = parameters["subtype"];
         // Hide Brand & Material for: Toys, Food, Books
         if (["toys", "food", "books"].includes(currentSubtype) && (filter.key === "brand" || filter.key === "material")) {
             return null;
         }
         // Hide Brand for: Furniture
         if (currentSubtype === "furniture" && filter.key === "brand") {
             return null;
         }
    }

    // --- Conditional Logic for Realty ---
    if (categoryKey === "realty" && (filter.key === "deposit" || filter.key === "utilities_included")) {
      const currentDealType = parameters["deal_type"];
      // Show only if deal type is rent or daily
      if (currentDealType !== "rent" && currentDealType !== "daily") {
        return null;
      }
    }


    const label = getSafeLabel(filter.label, filter.key);
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
                      {getSafeLabel(opt.label, opt.value)}
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
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6"
              >
                  <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <motion.path 
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2.5} 
                        d="M5 13l4 4L19 7" 
                      />
                  </svg>
              </motion.div>
              <h1 className="text-2xl font-bold mb-2 dark:text-white animate-fade-in-up">
                  {t("congrats") || "Поздравляем!"}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-8 animate-fade-in-up delay-100">
                  {t("listing_published") || "Ваше объявление опубликовано!"}
              </p>
              
              <button 
                  onClick={() => {
                      // Force refresh to show new listing
                      router.refresh();
                      setTimeout(() => router.push('/'), 100);
                  }}
                  className="w-full max-w-xs py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium animate-fade-in-up delay-200"
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
          <BackButton onClick={handleBack} />
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
                <span>{getSafeLabel(cat, cat.ru)}</span>
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

        {/* цена (Скрываем для типа 'free' и категории 'help_offer' и 'free') */}
        {listingType !== 'free' && categoryKey !== 'help_offer' && categoryKey !== 'free' && (
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
              onChange={(e) => {
                  let val = e.target.value;
                  // Strip leading zeroes (e.g. 043 -> 43), but allow single 0
                  if (val.length > 1 && val.startsWith('0')) {
                      val = val.replace(/^0+/, '');
                  }
                  setPrice(val);
              }}
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
        <LocationPicker 
            location={location} 
            setLocation={setLocation} 
            setCoordinates={setCoordinates} 
        />

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

        {/* Состояние (только для товаров, не для услуг, и не для помощи) */}
        {/* Состояние (Скрываем для услуг, животных, работы и т.д.) - EDUCATION REMOVED so it shows */}
        {listingType !== "service" && !['jobs', 'business', 'help_offer', 'translations', 'pets', 'exchange'].includes(categoryKey) && (
        <div className="mb-3">
          <div className="text-[11px] font-semibold mb-1 dark:text-gray-300">{t("condition_label") || "Состояние"}</div>
          <div className="relative">
            <select
              className="w-full border border-black dark:border-white/20 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-foreground dark:text-white appearance-none"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
               {categoryKey === 'realty' ? (
                   <>
                       {/* Realty specific options */}
                       <option value="new_building">{t("condition_new_building")}</option>
                       <option value="secondary">{t("condition_secondary")}</option>
                   </>
               ) : (
                   <>
                       <option value="new">{t("condition_new")}</option>
                       <option value="used">{t("condition_used")}</option>
                       <option value="like_new">{t("condition_like_new")}</option>
                   </>
               )}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
        )}


        {/* До/После (Только для услуг) */}
        {listingType === 'service' && (
            <BeforeAfterUploader value={beforeAfterImages} onChange={setBeforeAfterImages} />
        )}

        {/* Динамические поля категории */}
        {categoryFilters.map(renderDynamicField)}

        {/* зона фото – много фото */}
        <ImageUploader images={images} setImages={setImages} />

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
