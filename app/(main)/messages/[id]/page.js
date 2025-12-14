"use client";

import { useSearchParams } from "next/navigation";
import ChatWindowClient from "@/components/ChatWindowClient";

export default function ChatPage({ params }) {
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listing_id");
  const sellerId = searchParams.get("seller_id");
  
  return (
    <ChatWindowClient 
      conversationId={params.id} 
      listingId={listingId}
      sellerId={sellerId}
    />
  );
}
