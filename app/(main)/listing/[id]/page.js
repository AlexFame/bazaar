import { supaAdmin } from "@/lib/supabaseAdmin"; // Use Admin client for server-side fetching
import ListingDetailClient from "@/components/ListingDetailClient";
import { supabase } from "@/lib/supabaseClient"; // Keep for client component if needed, or remove if unused in server part

export async function generateMetadata({ params }) {
  const { id } = params;
  const admin = supaAdmin();
  
  const { data: listing } = await admin
    .from("listings")
    .select("title, description, price, main_image_path, listing_images(file_path)")
    .eq("id", id)
    .single();

  if (!listing) {
    return {
      title: "Объявление не найдено | Bazaar",
    };
  }

  let imageUrl = null;
  
  // 1. Try main_image_path
  if (listing.main_image_path) {
      const { data } = admin.storage.from("listing-images").getPublicUrl(listing.main_image_path);
      imageUrl = data?.publicUrl;
  } 
  // 2. Fallback to first image in listing_images
  else if (listing.listing_images && listing.listing_images.length > 0) {
      const path = listing.listing_images[0].file_path;
      const { data } = admin.storage.from("listing-images").getPublicUrl(path);
      imageUrl = data?.publicUrl;
  }

  const title = `${listing.title} | ${listing.price} € | Bazaar`;
  const description = listing.description?.slice(0, 160) || "Смотрите это объявление на Bazaar";

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: imageUrl ? [imageUrl] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

async function getListing(id) {
    // Also use admin for JSON-LD to be consistent
    const admin = supaAdmin();
    const { data } = await admin
    .from("listings")
    .select("title, description, price, main_image_path, listing_images(file_path)")
    .eq("id", id)
    .single();
    return data;
}

export default async function ListingPage({ params }) {
  const listing = await getListing(params.id);

  let jsonLd = null;
  if (listing) {
      const admin = supaAdmin();
      const imageUrl = listing.main_image_path 
        ? admin.storage.from("listing-images").getPublicUrl(listing.main_image_path).data.publicUrl
        : (listing.listing_images?.[0]?.file_path 
            ? admin.storage.from("listing-images").getPublicUrl(listing.listing_images[0].file_path).data.publicUrl
            : null);

      jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": listing.title,
        "image": imageUrl ? [imageUrl] : [],
        "description": listing.description,
        "offers": {
          "@type": "Offer",
          "priceCurrency": "EUR", 
          "price": listing.price
        }
      };
  }

  return (
      <>
        {jsonLd && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
        )}
        <ListingDetailClient id={params.id} />
      </>
  );
}
