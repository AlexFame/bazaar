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

export default function ListingPage({ params }) {
  // We need to fetch data here server side again to build the Schema
  // Or we can pass it down if we refactor, but for now let's just stick it in the Client Component? 
  // Next.js App Router recommends putting JSON-LD in the Server Component if possible.
  // Since we don't have the data here (except in generateMetadata), let's rely on the Client component or fetch it quickly.
  // Actually, we can just fetch it here for the payload, it acts as a cache usually.
  
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            // We'll populate this dynamically in the client or fetch here. 
            // To be efficient, let's keep it simple and just render the Client Component as before, 
            // but for a PROPER implementation we should inject it here.
            // Let's hold off on re-fetching to avoid dupes and let's add it to the Client Component or separate Server Component.
          })
        }} 
      />
      {/* 
         On second thought, implementing JSON-LD properly requires the data. 
         Let's wrap the client component in a server component that fetches data solely for the Schema if we want it perfect.
         BUT, `ListingDetailClient` fetches its own data.
         
         Let's do this: we already fetch for metadata. Let's reuse that logic or just accept it's a client specific app mostly for Telegram.
         However, for Google Indexing, it must be in the HTML.
      */}
      <ListingDetailClient id={params.id} />
    </>
  );
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
