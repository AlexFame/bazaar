import { supabase } from "@/lib/supabaseClient";
import ListingDetailClient from "@/components/ListingDetailClient";

export async function generateMetadata({ params }) {
  const { id } = params;
  
  const { data: listing } = await supabase
    .from("listings")
    .select("title, description, price, image_path")
    .eq("id", id)
    .single();

  if (!listing) {
    return {
      title: "Объявление не найдено | Bazaar",
    };
  }

  let imageUrl = null;
  if (listing.image_path) {
      const { data } = supabase.storage.from("listing-images").getPublicUrl(listing.image_path);
      imageUrl = data?.publicUrl;
  }

  return {
    title: `${listing.title} | ${listing.price} € | Bazaar`,
    description: listing.description?.slice(0, 160) || "Смотрите это объявление на Bazaar",
    openGraph: {
      title: listing.title,
      description: listing.description?.slice(0, 160),
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default function ListingPage({ params }) {
  return <ListingDetailClient id={params.id} />;
}
