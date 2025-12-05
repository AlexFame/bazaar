"use client";

import { motion } from "framer-motion";

export default function FadeIn({ children, className, delay = 0, duration = 0.4 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ 
        duration: duration, 
        delay: delay,
        ease: [0.21, 0.47, 0.32, 0.98] // Apple-like ease-out
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
