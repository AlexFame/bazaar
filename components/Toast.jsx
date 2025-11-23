"use client";

import { useEffect, useState } from "react";

export default function Toast({ message, onClose, duration = 3000 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setVisible(true);
    
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 transform ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
      }`}
    >
      <div className="bg-black text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-3 min-w-[300px] max-w-[90vw]">
        <div className="flex-1 text-sm font-medium truncate">
          {message}
        </div>
        <button 
            onClick={() => {
                setVisible(false);
                setTimeout(onClose, 300);
            }}
            className="text-white/60 hover:text-white"
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
            </svg>
        </button>
      </div>
    </div>
  );
}
