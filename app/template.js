"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function Template({ children }) {
  const pathname = usePathname();

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
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
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
