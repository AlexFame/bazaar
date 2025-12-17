"use client";
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLang } from '@/lib/i18n-client';
import { motion, AnimatePresence } from 'framer-motion';

export default function BeforeAfterSlider({ beforeImage, afterImage }) {
  const { t } = useLang();
  const [zoomedImage, setZoomedImage] = useState(null);

  if (!beforeImage || !afterImage) return null;

  const handleZoom = (img) => {
    if (zoomedImage) {
      setZoomedImage(null);
    } else {
      setZoomedImage(img);
    }
  };

  return (
    <div className="w-full mb-6">
      <h3 className="text-sm font-semibold mb-3 dark:text-white">
          {t("before_after_label") || "До / Після"}
      </h3>
      
      <div className="grid grid-cols-2 gap-2">
         {/* BEFORE */}
         <div 
           className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 dark:bg-neutral-800 border border-black/5 dark:border-white/5 cursor-zoom-in active:scale-[0.98] transition-transform"
           onClick={() => handleZoom(beforeImage)}
         >
            <img
              src={beforeImage}
              alt="Before"
              className="w-full h-full object-cover pointer-events-none"
            />
            <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider backdrop-blur-sm">
                {t("label_before") || "До"}
            </div>
         </div>

         {/* AFTER */}
         <div 
           className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 dark:bg-neutral-800 border border-black/5 dark:border-white/5 cursor-zoom-in active:scale-[0.98] transition-transform"
           onClick={() => handleZoom(afterImage)}
         >
            <img
              src={afterImage}
              alt="After"
              className="w-full h-full object-cover pointer-events-none"
            />
            <div className="absolute top-2 left-2 bg-green-600/80 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider backdrop-blur-sm">
                {t("label_after") || "Після"}
            </div>
         </div>
      </div>

      <AnimatePresence mode="wait">
        {zoomedImage && typeof document !== 'undefined' && (
          createPortal(
            <motion.div
              key="zoom-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] flex items-center justify-center bg-black touch-none p-4"
              onClick={() => setZoomedImage(null)}
            >
              <motion.div
                key={zoomedImage}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="relative w-full h-full flex items-center justify-center pointer-events-none"
              >
                <img
                  src={zoomedImage}
                  alt="Zoomed"
                  className="max-w-full max-h-full object-contain pointer-events-auto rounded-md shadow-2xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedImage(null);
                  }}
                />
                <button 
                  className="absolute top-4 right-4 md:top-8 md:right-8 text-white text-xs font-medium bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/20 active:bg-white/20 transition-colors pointer-events-auto"
                  onClick={(e) => {
                     e.stopPropagation();
                     setZoomedImage(null);
                  }}
                >
                  {t("close") || "Закрити"}
                </button>
              </motion.div>
            </motion.div>,
            document.body
          )
        )}
      </AnimatePresence>
    </div>
  );
}
