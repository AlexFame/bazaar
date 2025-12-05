"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

const MAX_PULL = 150;
const REFRESH_THRESHOLD = 100;

export default function PullToRefresh({ onRefresh, children }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const rotate = useTransform(y, [0, REFRESH_THRESHOLD], [0, 360]);
  const opacity = useTransform(y, [0, REFRESH_THRESHOLD / 2], [0, 1]);

  const handleDragEnd = async () => {
    if (y.get() > REFRESH_THRESHOLD) {
      setIsRefreshing(true);
      // Snap to threshold
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

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Loading Indicator */}
      <motion.div
        style={{ y, opacity, rotate }}
        className="absolute top-0 left-0 w-full flex justify-center pt-4 z-10 pointer-events-none"
      >
        <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center">
          {isRefreshing ? (
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5 text-black"
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

      {/* Content */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ y }}
        className="h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}
