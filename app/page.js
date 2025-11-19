"use client";

import { useSearchParams } from "next/navigation";
import PopularListingsScroll from "@/components/PopularListingsScroll";
import FeedPageClient from "@/components/FeedPageClient";
import CategoryScroll from "@/components/CategoryScroll";

export default function Page() {
  const searchParams = useSearchParams();
  const hasSearchQuery = (searchParams.get("q") || "").trim().length > 0;

  return (
    <>
      {!hasSearchQuery && <PopularListingsScroll />}
      {!hasSearchQuery && <CategoryScroll />}
      <FeedPageClient />
    </>
  );
}
