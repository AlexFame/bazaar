"use client";

import { useState, useRef, useEffect } from "react";
import { useLang } from "@/lib/i18n-client";

export default function BeforeAfterSlider({ beforeImage, afterImage }) {
  const { t } = useLang();
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  const startResizing = () => setIsResizing(true);
  const stopResizing = () => setIsResizing(false);

  const onMouseMove = (e) => {
    if (!isResizing || !containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const pos = Math.max(0, Math.min(100, (x / width) * 100));
    setSliderPosition(pos);
  };

  const onTouchMove = (e) => {
    if (!isResizing || !containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - left;
    const pos = Math.max(0, Math.min(100, (x / width) * 100));
    setSliderPosition(pos);
  };

  useEffect(() => {
    window.addEventListener("mouseup", stopResizing);
    window.addEventListener("touchend", stopResizing);
    return () => {
        window.removeEventListener("mouseup", stopResizing);
        window.removeEventListener("touchend", stopResizing);
    };
  }, []);

  if (!beforeImage || !afterImage) return null;

  return (
    <div className="w-full mb-6">
      <h3 className="text-sm font-semibold mb-3 dark:text-white">
          {t("results_of_work") || "Результаты работы"}
      </h3>
      
      <div 
        ref={containerRef}
        className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden cursor-ew-resize select-none touch-none"
        onMouseDown={startResizing}
        onTouchStart={startResizing}
        onMouseMove={onMouseMove}
        onTouchMove={onTouchMove}
      >
        {/* AFTER Image (Background/Underneath) - wait, standard is Before on left? 
            Usually: Left is Before, Right is After.
            Let's say we reveal After from left? Or standard implementation:
            Base layer: After. Top layer: Before (clipped).
            If slider is at 50%: Left 50% shows Before? Or Left 50% shows After?
            Usually: "Slide to right to see more After".
            Let's make Left = Before, Right = After.
        */}
        
        {/* 1. Underlying image (Right side / After) */}
        <img
          src={afterImage}
          alt="After"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
        
        {/* Label After */}
        <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] px-2 py-1 rounded-md z-10 font-medium">
             {t("label_after") || "После"}
        </div>
        
        {/* 2. Overlay image (Left side / Before) - clipped */}
        <div 
            className="absolute inset-0 h-full overflow-hidden pointer-events-none"
            style={{ width: `${sliderPosition}%` }}
        >
            <img
            src={beforeImage}
            alt="Before"
            className="absolute inset-0 w-full h-full object-cover max-w-none"
            // max-w-none is critical so image doesn't squash, it just clips
            style={{ width: containerRef.current?.offsetWidth || '100%' }} 
            />
            {/* Label Before */}
            <div className="absolute top-3 left-3 bg-black/60 text-white text-[10px] px-2 py-1 rounded-md z-10 font-medium">
                {t("label_before") || "До"}
            </div>
        </div>

        {/* 3. Slider Handle */}
        <div 
            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
            style={{ left: `${sliderPosition}%` }}
        >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l-4 3 4 3m8-6l4 3-4 3" />
                </svg>
            </div>
        </div>

      </div>
    </div>
  );
}
