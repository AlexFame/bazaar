"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function Template({ children }) {
  const pathname = usePathname();

  // Top-level "Tab" routes (Navigation Bar items)
  // Switching between these should feel like instant/fade tab switching, not a full page slide.
  const isTabRoute = ["/", "/catalog", "/create", "/messages", "/my"].includes(pathname);

  const variants = {
    hidden: { opacity: 0, x: isTabRoute ? 0 : 20 },
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: isTabRoute ? 0 : -20 },
  };

  return (
    <motion.div
      key={pathname}
      variants={variants}
      initial="hidden"
      animate="enter"
      exit="exit"
      // Use faster/springier transition for tabs (just fade), and standard spring for slides
      transition={isTabRoute 
        ? { duration: 0.2, ease: "easeInOut" } // Quick Fade
        : { type: "spring", stiffness: 260, damping: 20 } // Slide
      }
      className="min-h-screen bg-white"
      style={{ 
        position: "relative",
        zIndex: 1 
      }}
    >
      {children}
    </motion.div>
  );
}
