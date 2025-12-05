"use client";

import { useEffect } from "react";

export default function MyPage() {
  useEffect(() => {
    console.log("✅ MyPage Minimal mounted successfully");
  }, []);

  return (
    <div className="p-4 text-center">
      <h1 className="text-xl font-bold mb-4">Test Profile Page</h1>
      <p>If you see this, the crash is caused by one of the components.</p>
    </div>
  );
}
