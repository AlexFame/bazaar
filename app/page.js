"use client";

import PopularListingsScroll from "@/components/PopularListingsScroll";
import FeedPageClient from "@/components/FeedPageClient";
import CategoryScroll from "@/components/CategoryScroll";

export default function Page() {
  return (
    <>
      <PopularListingsScroll />
      <CategoryScroll />
      <FeedPageClient />
    </>
  );
}
