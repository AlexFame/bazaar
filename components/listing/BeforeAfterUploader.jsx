"use client";

import { useState, useRef } from "react";
import { useLang } from "@/lib/i18n-client";
import imageCompression from "browser-image-compression";
import { XMarkIcon, PhotoIcon } from "@heroicons/react/24/solid";

export default function BeforeAfterUploader({ value, onChange }) {
  const { t } = useLang();
  // value is { before: file|url, after: file|url } or null
  // We need to handle both File objects (new) and URL strings (existing/restored)

  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: "image/jpeg",
      };

      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const newData = { ...(value || {}) };
        newData[type] = {
            file: compressedFile, // For upload
            url: event.target.result // For preview
        };
        onChange(newData);
      };
      reader.readAsDataURL(compressedFile);

    } catch (error) {
      console.error("Compression error:", error);
      // Fallback
      const newData = { ...(value || {}) };
      newData[type] = { 
          file: file,
          url: URL.createObjectURL(file) 
      };
      onChange(newData);
    } finally {
      setIsLoading(false);
    }
  };

  const removeImage = (type) => {
    const newData = { ...(value || {}) };
    delete newData[type];
    onChange(newData);
  };

  return (
    <div className="mb-4">
      <div className="text-[11px] font-semibold mb-2 dark:text-gray-300">
        {t("before_after_label") || "Результаты работ (До / После)"}
      </div>
      
      <div className="flex gap-3">
        {/* BEFORE */}
        <div className="flex-1">
          <div className="text-[10px] text-center mb-1 text-gray-500">
            {t("label_before") || "До"}
          </div>
          
          {value?.before ? (
            <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
              <img 
                src={value.before.url || value.before} 
                alt="Before" 
                className="w-full h-full object-cover" 
              />
              <button
                type="button"
                onClick={() => removeImage('before')}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-white/20 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <PhotoIcon className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-[10px] text-gray-500">{t("upload") || "Загрузить"}</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => handleFileChange(e, 'before')}
              />
            </label>
          )}
        </div>

        {/* AFTER */}
        <div className="flex-1">
          <div className="text-[10px] text-center mb-1 text-gray-500">
            {t("label_after") || "После"}
          </div>

          {value?.after ? (
            <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
              <img 
                src={value.after.url || value.after} 
                alt="After" 
                className="w-full h-full object-cover" 
              />
              <button
                type="button"
                onClick={() => removeImage('after')}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-white/20 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <PhotoIcon className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-[10px] text-gray-500">{t("upload") || "Загрузить"}</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => handleFileChange(e, 'after')}
              />
            </label>
          )}
        </div>
      </div>
      <div className="text-[10px] text-gray-400 mt-1.5 text-center leading-tight">
        {t("before_after_hint") || "Загрузите фото 'До' и 'После', чтобы показать результат работы в слайдере."}
      </div>
    </div>
  );
}
