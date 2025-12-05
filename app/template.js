"use client";

import { motion, useDragControls } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function Template({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const dragControls = useDragControls();

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
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="min-h-screen bg-white"
      drag={!isHome ? "x" : false}
      dragControls={dragControls}
      dragListener={false} // Disable default drag listener (full screen)
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 1 }} // Full elasticity for natural feel
      dragSnapToOrigin={true} // Snap back if not swiped enough
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
        touchAction: "pan-y", // Allow vertical scrolling
        position: "relative",
        zIndex: 1 
      }}
    >
      {/* Edge hit area - Only this area triggers the drag */}
      {!isHome && (
        <div 
          className="absolute top-0 bottom-0 left-0 w-8 z-50" // 32px edge area
          onPointerDown={(e) => dragControls.start(e)}
          style={{ touchAction: "none", cursor: "grab" }}
        />
      )}
      
      {children}
    </motion.div>
  );
}
