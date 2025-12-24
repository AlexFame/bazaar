import { useState, useEffect, useRef } from 'react';

// Cache for suggestions to avoid spamming the API
const suggestionCache = {};

export function useCityAutocomplete(query, minLength = 2) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Debounce ref
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!query || query.length < minLength) {
      setSuggestions([]);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // If cached, use it (but still allow fresh fetch if needed? No, cache is fine for cities)
    if (suggestionCache[query.toLowerCase()]) {
        setSuggestions(suggestionCache[query.toLowerCase()]);
        return;
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Limited to 5 results, prioritizing Europe/DACH if possible, but general search is fine
        // accept-language ensures we get German/Russian/English names
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&accept-language=ru,de,en`
        );
        
        if (!res.ok) throw new Error("Nominatim fetch failed");
        
        const data = await res.json();
        
        const mapped = data.map(item => {
            const city = item.address?.city || item.address?.town || item.address?.village || item.name;
            const country = item.address?.country;
            // distinct name
            const label = country ? `${city}, ${country}` : city;
            return {
                label,
                value: city, // We mostly care about the city name for the text filter
                lat: item.lat,
                lon: item.lon
            };
        }).filter(item => item.value); // Ensure we have a city name
        
        // Deduplicate by label
        const unique = [...new Map(mapped.map(item => [item.label, item])).values()];
        
        suggestionCache[query.toLowerCase()] = unique;
        setSuggestions(unique);
      } catch (e) {
        console.error("Autocomplete error:", e);
        // Don't break UI on error, just show no suggestions
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutRef.current);
  }, [query, minLength]);

  return { suggestions, loading };
}
