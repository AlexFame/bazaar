import { supabase } from "@/lib/supabaseClient";
import { BaseService } from "./BaseService";

/**
 * Service Layer for Listings (Polymorphism Pattern)
 * Abstracts all direct Supabase SQL queries out of the frontend UI components, inheriting from BaseService.
 */
class ListingServiceClass extends BaseService {
  constructor() {
    super('listings');
  }

  /**
   * Fetches the main feed of listings based on rich text filters.
   */
  async search(filters) {
    const {
      page = 0,
      pageSize = 10,
      searchTerm = "",
      locationFilter = "",
      categoryFilter = "all",
      typeFilter = "all",
      conditionFilter = "all",
      minPrice,
      maxPrice,
      withPhotoFilter = "all",
      sellerStatusFilter = "any",
      deliveryFilter = "all",
      dateFilter = "all",
      barterFilter = "all",
      dynamicFilters = {},
      sortFilter = "date_desc",
      viewMode = "list",
      userLocation = null,
      radiusFilter = null,
      preserveOrder = false,
      locationIds = null,
      abortSignal = null
    } = filters;

    // Server-side Pre-Filter (Location & Search Sorting)
    let preserveOrderFlag = preserveOrder;
    let computedLocationIds = locationIds;
    
    // CASE A: Radius Filter is Active -> Strict Cutoff
    if (userLocation && radiusFilter) {
        try {
            const { data: locData, error: locError } = await supabase.rpc('get_listings_within_radius', {
                lat: userLocation.lat,
                lon: userLocation.lng,
                radius_km: Number(radiusFilter)
            });
            if (!locError && locData) computedLocationIds = locData.map(x => x.id);
        } catch(e) { console.error(e); }
    } 
    // CASE B: No Radius, but User Has Location + Search Term -> Auto-Sort by Distance
    else if (userLocation && (searchTerm || "").trim().length > 0 && !sortFilter) {
        try {
            const { data: sortedIds, error: sortErr } = await supabase.rpc('get_search_listings_sorted_by_distance', {
                lat: userLocation.lat,
                lon: userLocation.lng,
                search_query: (searchTerm || "").trim(),
                max_limit: 100 // Fetch top 100 nearest matches
            });
            if (!sortErr && sortedIds) {
                computedLocationIds = sortedIds.map(x => x.id);
                preserveOrderFlag = true; 
            }
        } catch(e) { console.error(e); }
    }

    if (computedLocationIds !== null && computedLocationIds.length === 0) {
        return []; // No results in location
    }

    // Base query
    let query = supabase
      .from("listings")
      .select("*")
      .in("status", ["active", "reserved"])
      .or("location_text.is.null,and(location_text.not.ilike.%Russia%,location_text.not.ilike.%Россия%)");

    if (viewMode === "map") {
      query = query.not("latitude", "is", null).not("longitude", "is", null);
    }

    // Sorting
    if (!preserveOrderFlag) {
      query = query.order("is_vip", { ascending: false });
      if (sortFilter === 'date_desc') {
        query = query.order("bumped_at", { ascending: false, nullsFirst: false });
      } else if (sortFilter === 'date_asc') {
        query = query.order("created_at", { ascending: true });
      } else if (sortFilter === 'price_asc') {
        query = query.order("price", { ascending: true });
      } else if (sortFilter === 'price_desc') {
        query = query.order("price", { ascending: false });
      } else {
        query = query.order("bumped_at", { ascending: false, nullsFirst: false });
      }
    }

    // Explicit ID filtering (e.g. from Geo Search RPC)
    if (computedLocationIds !== null) {
      query = query.in('id', computedLocationIds);
    }

    // Pagination
    if (!preserveOrderFlag && viewMode !== "map") {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    // Text Search
    const term = (searchTerm || "").trim();
    if (term && !preserveOrder) {
      // Very basic expansion matching what was in UI
      const variants = [term, ...term.split(" ")];
      const orCondition = variants.map(v => `title.ilike.%${v}%`).join(",");
      query = query.or(orCondition);
    }

    // Location Text
    if (locationFilter.trim()) {
      query = query.ilike("location_text", `%${locationFilter.trim()}%`);
    }

    // Exact match filters
    if (categoryFilter !== "all" && categoryFilter) query = query.eq("category_key", categoryFilter);
    if (typeFilter !== "all" && typeFilter) query = query.eq("type", typeFilter);
    if (conditionFilter !== "all" && conditionFilter) query = query.eq("condition", conditionFilter);

    // Numeric Filters
    if (minPrice && !isNaN(Number(minPrice))) query = query.gte("price", Number(minPrice));
    if (maxPrice && !isNaN(Number(maxPrice))) query = query.lte("price", Number(maxPrice));

    // Photo
    if (withPhotoFilter === "yes") {
      query = query.not("main_image_path", "is", null);
    } else if (withPhotoFilter === "no") {
      query = query.is("main_image_path", null);
    }

    // Seller & Delivery metadata
    if (sellerStatusFilter === 'verified') query = query.eq('profiles.is_verified', true);
    if (sellerStatusFilter === 'rating_4') query = query.gte('profiles.rating', 4);
    if (deliveryFilter === 'pickup') query = query.contains('parameters', { pickup: true });
    if (deliveryFilter === 'delivery') query = query.contains('parameters', { delivery: true });
    if (barterFilter === "yes") query = query.contains("parameters", { barter: true });

    // Dates
    if (dateFilter !== "all") {
      const now = new Date();
      let fromDate;
      if (dateFilter === "today") fromDate = new Date(new Date().setHours(0, 0, 0, 0));
      else if (dateFilter === "3d") fromDate = new Date(now.getTime() - 3 * 86400000);
      else if (dateFilter === "7d") fromDate = new Date(now.getTime() - 7 * 86400000);
      else if (dateFilter === "30d") fromDate = new Date(now.getTime() - 30 * 86400000);
      if (fromDate) query = query.gte("created_at", fromDate.toISOString());
    }

    // Dynamic JSONB Range Filters (e.g. from SearchParams dyn_)
    if (categoryFilter !== "all" && Object.keys(dynamicFilters).length > 0) {
        const exactFilters = {};
        Object.entries(dynamicFilters).forEach(([k, v]) => {
            if (v && !k.endsWith('_min') && !k.endsWith('_max')) {
                exactFilters[k] = v;
            }
        });
        if (Object.keys(exactFilters).length > 0) {
            query = query.contains("parameters", exactFilters);
        }
    }

    if (abortSignal) {
        query = query.abortSignal(abortSignal);
    }

    const { data: rawData, error } = await query;
    if (error) throw error;
    
    // Auto-enrich results with profiles and images (acting like an ORM join)
    return await this._enrichListings(rawData || []);
  }

  /**
   * Helper to fetch joined profiles and images for an array of listings
   */
  async _enrichListings(listings) {
    if (!listings || listings.length === 0) return [];

    const listingIds = listings.map((l) => l.id);
    const userIds = [...new Set(listings.map((l) => l.created_by).filter(Boolean))];

    const [imagesRes, profilesRes] = await Promise.all([
      supabase.from("listing_images").select("listing_id, file_path").in("listing_id", listingIds),
      supabase.from("profiles").select("id, tg_username, full_name, avatar_url").in("id", userIds)
    ]);

    const imagesData = imagesRes.data || [];
    const profilesData = profilesRes.data || [];

    return listings.map((listing) => {
        const listingImages = imagesData
            .filter((img) => img.listing_id === listing.id)
            .map((img) => ({ image_path: img.file_path }));
            
        const profile = profilesData.find((p) => p.id === listing.created_by);
        const mappedProfile = profile ? {
            is_verified: false,
            username: profile.tg_username,
            first_name: profile.full_name ? profile.full_name.split(" ")[0] : "",
            last_name: profile.full_name ? profile.full_name.split(" ").slice(1).join(" ") : "",
            avatar_url: profile.avatar_url,
        } : null;

        return {
            ...listing,
            main_image_path: listing.main_image_path || listingImages[0]?.image_path || null,
            listing_images: listingImages,
            profiles: mappedProfile,
        };
    });
  }

  /**
   * Polymorphic Override: Fetch a single listing by ID and completely enrich it with joins.
   */
  async getById(id) {
    // Call parent generic getById
    const data = await super.getById(id, '*');
    if (!data) return null;
    const enriched = await this._enrichListings([data]);
    return enriched[0];
  }

  // delete(id) is natively inherited from BaseService!
  // create(payload) is natively inherited from BaseService!
  // update(id, payload) is natively inherited from BaseService!

  /**
   * Provide autocomplete suggestions for search terms
   */
  async getSuggestions(term, lang = 'ru') {
      if (!term || term.length < 2) return [];
      
      const generateSearchVariants = (text) => {
          const variants = [text.toLowerCase()];
          const translations = {
            'iphone': 'айфон', 'айфон': 'iphone',
            'ipad': 'айпад', 'айпад': 'ipad',
            'macbook': 'макбук', 'макбук': 'macbook',
            'apple': 'эппл', 'эппл': 'apple',
            'samsung': 'самсунг', 'самсунг': 'samsung',
            'xiaomi': 'сяоми', 'сяоми': 'xiaomi',
            'huawei': 'хуавей', 'хуавей': 'huawei',
            'lenovo': 'леново', 'леново': 'lenovo',
            'asus': 'асус', 'асус': 'asus',
            'acer': 'эйсер', 'эйсер': 'acer',
            'dell': 'делл', 'делл': 'dell',
            'sony': 'сони', 'сони': 'sony'
          };
          const lowerText = text.toLowerCase();
          if (translations[lowerText]) variants.push(translations[lowerText]);
          for (const [key, value] of Object.entries(translations)) {
            if (lowerText.includes(key) && key !== lowerText) {
              variants.push(lowerText.replace(key, value));
            }
          }
          return [...new Set(variants)];
      };

      const searchVariants = generateSearchVariants(term);
      
      const orCondition = searchVariants.map(v => 
        `title.ilike.${v}%,title.ilike.% ${v}%,title.ilike.%-${v}%,title.ilike.%«${v}%,title.ilike.%\"${v}%,title.ilike.%(${v}%`
      ).join(",");
      
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, category_key, price, main_image_path")
        .or(orCondition)
        .eq("status", "active")
        .limit(10);
      
      if (error || !data) return [];
      
      const uniqueData = Array.from(new Map(data.map(item => [item.id, item])).values());
      return uniqueData;
  }
}

export const ListingService = new ListingServiceClass();
