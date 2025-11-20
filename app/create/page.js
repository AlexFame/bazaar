"use client";

import { useSearchParams } from "next/navigation";
import CreateListingClient from "@/components/CreateListingClient";

export default function CreatePage() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  
  return <CreateListingClient editId={editId} />;
}
