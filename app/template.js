"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Template({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);

  // Disable swipe back on home page
  const isHome = pathname === "/";

  const variants = {
    hidden: { opacity: 0, x: 20 },
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <motion.div
      key={pathname}
      variants={variants}
      initial="hidden"
      animate="enter"
      exit="exit"
      transition={{ type: "linear", duration: 0.25 }}
      className="min-h-screen bg-white"
      drag={!isHome ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.5 }} // Elastic pull to the right
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(e, { offset, velocity }) => {
        setIsDragging(false);
        const swipeThreshold = 100;
        const velocityThreshold = 0.5;

        // If swiped right enough or fast enough
        if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
          router.back();
        }
      }}
      style={{ 
        touchAction: "pan-y", // Allow vertical scrolling, handle horizontal gestures manually
        position: "relative",
        zIndex: 1 
      }}
    >
      {/* Edge hit area for easier swipe initiation (optional visual cue or logic) */}
      {!isHome && (
        <div 
          className="absolute top-0 bottom-0 left-0 w-5 z-50"
          style={{ touchAction: "none" }} // Capture touches on the edge
        />
      )}
      
      {children}
    </motion.div>
  );
}
