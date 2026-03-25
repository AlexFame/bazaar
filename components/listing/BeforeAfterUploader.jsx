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

  const isVideo = (srcObj) => {
      if (!srcObj) return false;
      const url = typeof srcObj === 'string' ? srcObj : (srcObj.url || "");
      const file = srcObj.file;
      if (file && file.type && file.type.startsWith('video/')) return true;
      return !!url.match(/\.(mp4|webm|mov|mkv)(\?.*)?$/i);
  };

  const renderPreview = (srcObj, type) => {
      const url = typeof srcObj === 'string' ? srcObj : srcObj.url;
      const isLocalFile = typeof srcObj !== 'string' && srcObj.file;

      if (isVideo(srcObj)) {
          // iOS WKWebView (Telegram) cannot play blob: videos. 
          // Show a placeholder for local files, and real video for remote files.
          if (isLocalFile) {
              const videoSelectedText = t("video_selected") === "video_selected" ? "Видео выбрано" : (t("video_selected") || "Видео выбрано");
              return (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-3 text-center">
                     <span className="text-[11px] font-medium opacity-70 mb-1">{videoSelectedText}</span>
                     <span className="text-[9px] opacity-50 truncate w-full">{srcObj.file.name}</span>
                  </div>
              );
          }
          // Append #t=0.001 to force WKWebView to load the first frame as poster
          const videoSrc = url.includes('#') ? url : `${url}#t=0.001`;
          return <video key={videoSrc} src={videoSrc} className="w-full h-full object-cover" autoPlay loop muted playsInline preload="metadata" />;
      }
      return <img src={url} className="w-full h-full object-cover" alt={type} />;
  };

  const handleFileChange = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
        alert(t("alert_video_too_large") || "Размер файла не должен превышать 30 МБ");
        e.target.value = ""; // Reset input
        return;
    }

    setIsLoading(true);
    try {
      if (file.type.startsWith("video/")) {
          // Bypass heavy JS compression for videos and rely on OS/Telegram native compression
          const newData = { ...(value || {}) };
          newData[type] = {
              file: file,
              url: URL.createObjectURL(file) 
          };
          onChange(newData);
          setIsLoading(false);
          return;
      }

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
              {renderPreview(value.before, "Before")}
              <button
                type="button"
                onClick={() => removeImage('before')}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 z-10 hover:bg-black/70"
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
                accept="image/*,video/mp4,video/quicktime,video/webm" 
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
              {renderPreview(value.after, "After")}
              <button
                type="button"
                onClick={() => removeImage('after')}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 z-10 hover:bg-black/70"
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
                accept="image/*,video/mp4,video/quicktime,video/webm" 
                className="hidden" 
                onChange={(e) => handleFileChange(e, 'after')}
              />
            </label>
          )}
        </div>
      </div>
      <div className="text-[10px] text-gray-400 mt-1.5 text-center leading-tight">
        {t("before_after_hint") || "Загрузите фото 'До' и 'После', чтобы показать результат. Поддерживаются видео (до 30 МБ)."}
      </div>
    </div>
  );
}
