"use client";

import Link from "next/link";
import { CATEGORY_DEFS } from "@/lib/categories";
import { useLang } from "@/lib/i18n-client";

export default function ListingInfo({ listing, translated }) {
    const { lang } = useLang();
    
    // Category Breadcrumbs Logic
    const category = CATEGORY_DEFS.find((c) => c.key === listing.category_key);
    let catLabel = null;
    let subtypeLabel = null;
    
    if (category) {
        catLabel = category[lang] || category.ru;
        if (listing.parameters && listing.parameters.subtype) {
            const subtypeFilter = category.filters.find(f => f.key === 'subtype');
            if (subtypeFilter && subtypeFilter.options) {
                const opt = subtypeFilter.options.find(o => o.value === listing.parameters.subtype);
                if (opt) subtypeLabel = opt.label[lang] || opt.label.ru;
            }
        }
    }

    return (
        <div className="mb-4">
            {/* Breadcrumbs */}
            {category && (
                <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500 mb-1">
                    <Link href={`/?category=${category.key}`} className="hover:text-black hover:underline flex items-center gap-1">
                        {category.icon} {catLabel}
                    </Link>
                    {subtypeLabel && (
                        <>
                            <span>›</span>
                            <Link 
                                href={`/?category=${category.key}&dyn_subtype=${listing.parameters.subtype}`}
                                className="hover:text-black hover:underline"
                            >
                                {subtypeLabel}
                            </Link>
                        </>
                    )}
                </div>
            )}

            {/* Title */}
            {listing.title && (
                <h1 className="text-sm font-semibold mt-1 mb-1">
                    {translated.title || listing.title}
                </h1>
            )}

            {/* Price & Views */}
            {typeof listing.price === "number" && (
                <div className="flex justify-between items-end mb-4">
                    <p className="text-sm font-semibold">{listing.price} €</p>
                    {listing.views_count !== undefined && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            👁️ {listing.views_count}
                        </span>
                    )}
                </div>
            )}
            
            {/* Description */}
            {listing.description && (
                <p className="text-xs text-black/80 whitespace-pre-wrap mb-2">
                  {translated.description || listing.description}
                </p>
            )}

            {/* Location */}
            {listing.location_text && (
                <p className="text-xs mt-1 text-black/60">
                  {listing.location_text}
                </p>
            )}
        </div>
    );
}
