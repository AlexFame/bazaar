"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  // Simple check for browser language if no better option, or default to EN.
  // Actually, we can try to respect the html lang attribute usually?
  // But global-error replaces HTML.
  // Let's implement basic client-side translation based on user preference if possible, 
  // or just show multi-lingual text or generic English + others.
  
  // Since we cannot use hooks that rely on Context easily here (maybe),
  // let's just make it simple: Trilingual or detection.
  // Best: "Something went wrong / Щось пішло не так / Что-то пошло не так"
  
  return (
    <html lang="en">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-white">
          <div className="bg-red-50 text-red-600 p-6 rounded-full mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          <p className="text-gray-500 mb-1">Щось пішло не так</p>
          <p className="text-gray-400 text-sm mb-6">Что-то пошло не так</p>

          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
          >
            Reload / Оновити
          </button>
        </div>
      </body>
    </html>
  );
}
