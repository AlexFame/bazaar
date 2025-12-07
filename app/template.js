"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function Template({ children }) {
  const pathname = usePathname();

  // Simple Fade animation (No "curtains" / slide)
  const variants = {
    hidden: { opacity: 0 },
    enter: { opacity: 1 },
    exit: { opacity: 0 },
  };

  return (
    <motion.div
      key={pathname}
      variants={variants}
      initial="hidden"
      animate="enter"
      exit="exit"
      transition={{ duration: 0.2, ease: "easeInOut" }}
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
