"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLang } from '@/lib/i18n-client';
import { motion, AnimatePresence } from 'framer-motion';

export default function BeforeAfterSlider({ beforeImage, afterImage }) {
  const { t } = useLang();
  const [zoomedImage, setZoomedImage] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Disable scroll when zoomed
  useEffect(() => {
    if (zoomedImage && typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    } else if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
    return () => { 
      if (typeof document !== 'undefined') document.body.style.overflow = ''; 
    };
  }, [zoomedImage]);

  if (!beforeImage || !afterImage) return null;

  const handleZoom = (img) => {
    setZoomedImage(img);
  };

  return (
    <div className="w-full mb-6 relative">
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

      {mounted && createPortal(
        <AnimatePresence>
          {zoomedImage && (
            <motion.div
              key="zoom-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[99999] flex items-center justify-center bg-black touch-none px-6"
              onClick={() => setZoomedImage(null)}
            >
              <motion.div
                key={zoomedImage}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative w-full h-full flex flex-col items-center justify-center"
              >
                <div className="absolute top-[8%] right-0">
                  <button 
                    className="text-white text-xs font-medium bg-white/20 px-5 py-2.5 rounded-full backdrop-blur-xl border border-white/30 active:scale-95 transition-transform"
                    onClick={(e) => {
                       e.stopPropagation();
                       setZoomedImage(null);
                    }}
                  >
                    {t("close") || "Закрити"}
                  </button>
                </div>

                <img
                  src={zoomedImage}
                  alt="Zoomed"
                  className="w-full max-h-[75dvh] object-contain rounded-lg shadow-2xl cursor-zoom-out"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedImage(null);
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
