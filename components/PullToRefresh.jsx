"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState, useRef } from "react";

const MAX_PULL = 150;
const REFRESH_THRESHOLD = 80;

export default function PullToRefresh({ onRefresh, children }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const rotate = useTransform(y, [0, REFRESH_THRESHOLD], [0, 360]);
  const opacity = useTransform(y, [0, REFRESH_THRESHOLD / 2], [0, 1]);
  
  const containerRef = useRef(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      // Only enable pull if we are at the very top of the page
      if (window.scrollY <= 5) {
        startY.current = e.touches[0].clientY;
        isPulling.current = false;
      }
    };

    const handleTouchMove = (e) => {
      // If we scrolled down, ignore
      if (window.scrollY > 5) return;
      
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      // Only handle pull down
      if (diff > 0) {
        // If we are not refreshing, track the pull
        if (!isRefreshing) {
            // We don't preventDefault here to allow some native feel, 
            // but if it conflicts we might need to.
            // For now, let's just animate our indicator.
            isPulling.current = true;
            
            // Logarithmic damping for resistance
            const damped = Math.min(diff * 0.4, MAX_PULL);
            y.set(damped);
        }
      } else {
        isPulling.current = false;
        y.set(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current) return;
      isPulling.current = false;

      const currentPull = y.get();
      if (currentPull > REFRESH_THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        animate(y, REFRESH_THRESHOLD, { type: "spring", stiffness: 300, damping: 30 });
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
        }
      } else {
        animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
      }
    };

    // Add listeners to the container
    container.addEventListener("touchstart", handleTouchStart);
    container.addEventListener("touchmove", handleTouchMove);
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [y, onRefresh, isRefreshing]);

  return (
    <div ref={containerRef} className="relative">
      {/* Loading Indicator - Absolute positioned at the top */}
      <motion.div
        style={{ y, opacity, rotate }}
        className="absolute top-0 left-0 w-full flex justify-center pointer-events-none z-20"
      >
        {/* Negative margin to hide it initially, or just rely on opacity/y */}
        <div className="mt-[-40px] w-10 h-10 rounded-full bg-white dark:bg-neutral-900 shadow-lg flex items-center justify-center border border-gray-100 dark:border-white/5">
          {isRefreshing ? (
            <div className="w-5 h-5 border-2 border-black dark:border-gray-500 border-t-transparent dark:border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5 text-black dark:text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
              />
            </svg>
          )}
        </div>
      </motion.div>

      {/* Content - moves down with pull */}
      <motion.div style={{ y }}>
        {children}
      </motion.div>
    </div>
  );
}
