"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
      <div className="bg-red-50 text-red-600 p-4 rounded-full mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
           <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      
      <h2 className="text-xl font-bold mb-1">Something went wrong</h2>
      <p className="text-gray-600 mb-6 max-w-md text-sm">
        Щось пішло не так / Что-то пошло не так
      </p>

      <div className="flex gap-3">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-200 rounded-xl font-medium hover:bg-gray-300 transition-colors"
        >
          Reload
        </button>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
