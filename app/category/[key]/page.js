"use client";

import { useParams } from "next/navigation";
import FeedPageClient from "@/components/FeedPageClient";
import { CATEGORY_DEFS } from "@/lib/categories";

export default function CategoryPage() {
  const params = useParams();
  const categoryKey = params.key;

  // Verify if category exists
  const categoryExists = CATEGORY_DEFS.some(c => c.key === categoryKey);

  if (!categoryExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Категория не найдена</h1>
          <a href="/" className="text-blue-500 hover:underline">На главную</a>
        </div>
      </div>
    );
  }

  return <FeedPageClient forcedCategory={categoryKey} />;
}
