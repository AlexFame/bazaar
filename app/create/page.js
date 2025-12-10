"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CreateListingClient from "@/components/CreateListingClient";
import { CreateListingSkeleton } from "@/components/SkeletonLoader";

function CreateContent() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  return <CreateListingClient editId={editId} />;
}

export default function CreatePage() {
  return (
    <Suspense fallback={<CreateListingSkeleton />}>
      <CreateContent />
    </Suspense>
  );
}
