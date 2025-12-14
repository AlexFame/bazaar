import { supabase } from "@/lib/supabaseClient";
import ListingDetailClient from "@/components/ListingDetailClient";

export async function generateMetadata({ params }) {
  const { id } = params;
  
  const { data: listing } = await supabase
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
      const { data } = supabase.storage.from("listing-images").getPublicUrl(listing.main_image_path);
      imageUrl = data?.publicUrl;
  } 
  // 2. Fallback to first image in listing_images
  else if (listing.listing_images && listing.listing_images.length > 0) {
      // Sort or pick first (assuming API returns in order or we pick any)
      const path = listing.listing_images[0].file_path;
      const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
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



// Let's rewrite this function to fetch data and pass it to a Schema component or render script directly
// Re-using the fetch from generateMetadata is tricky without deduping request (Next.js does this automatically for fetch(), but supabase client might not).

// Better approach:
// We will modify this file to fetch the listing data strictly for the JSON-LD script.
// The Client Component will still do its thing (hydration).

async function getListing(id) {
    const { data } = await supabase
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
      const imageUrl = listing.main_image_path 
        ? supabase.storage.from("listing-images").getPublicUrl(listing.main_image_path).data.publicUrl
        : (listing.listing_images?.[0]?.file_path 
            ? supabase.storage.from("listing-images").getPublicUrl(listing.listing_images[0].file_path).data.publicUrl
            : null);

      jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": listing.title,
        "image": imageUrl ? [imageUrl] : [],
        "description": listing.description,
        "offers": {
          "@type": "Offer",
          "priceCurrency": "EUR", // Defaulting to EUR as per metadata
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
