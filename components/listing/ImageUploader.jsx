"use client";

import { useLang } from "@/lib/i18n-client";
import { checkImage } from "@/lib/moderation";
import imageCompression from "browser-image-compression";
import { XMarkIcon } from "@heroicons/react/24/solid";

export default function ImageUploader({ images, setImages }) {
  const { t } = useLang();

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  async function processFiles(fileList) {
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
        let msg = check.error; // fallback
        if (check.errorKey) {
          msg = t(check.errorKey);
          if (check.params) {
            Object.entries(check.params).forEach(([k, v]) => {
              msg = msg.replace(`{${k}}`, v);
            });
          }
        }
        alert(`${file.name}: ${msg}`);
        continue;
      }

      try {
        console.log(`Compressing ${file.name}...`);
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: "image/jpeg",
        };

        const compressedFile = await imageCompression(file, options);
        console.log(
          `Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(
            compressedFile.size / 1024 / 1024
          ).toFixed(2)}MB`
        );

        const reader = new FileReader();
        reader.onload = (event) => {
          setImages((prev) => [
            ...prev,
            {
              type: "new",
              url: event.target.result,
              file: compressedFile,
            },
          ]);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Image compression error:", error);
        // Fallback to original
        const reader = new FileReader();
        reader.onload = (event) => {
          setImages((prev) => [
            ...prev,
            {
              type: "new",
              url: event.target.result,
              file: file,
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  function handleRemoveImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="mb-3">
        <div className="text-[11px] font-semibold mb-1 dark:text-gray-300">
            {t("field_photos") || "Фото"}
        </div>
        <div
        className="w-full mt-2 border border-dashed border-gray-300 dark:border-white/20 rounded-2xl px-4 py-8 text-xs text-center cursor-pointer bg-transparent dark:bg-white/5 text-foreground dark:text-white"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        >
        <label className="flex flex-col items-center justify-center gap-2 cursor-pointer">
            {images.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 w-full justify-items-center">
                {images.map((img, idx) => (
                <div key={idx} className="relative w-full" style={{ paddingBottom: "100%" }}>
                    <img
                    src={img.url}
                    alt={`Предпросмотр ${idx + 1}`}
                    className="absolute inset-0 w-full h-full rounded-xl object-cover border border-gray-100 dark:border-white/10"
                    />
                    <button
                    type="button"
                    className="absolute -top-1 -right-1 bg-black text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center z-10"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleRemoveImage(idx);
                    }}
                    >
                    <XMarkIcon className="w-3 h-3 text-white" />
                    </button>
                </div>
                ))}
            </div>
            ) : (
            <>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <div className="text-xs font-semibold dark:text-gray-200">
                    {t("upload_photos_label") || "Загрузите фото"}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    {t("field_photos_ph") || "до 10 шт"}
                </div>
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
    </div>
  );
}
