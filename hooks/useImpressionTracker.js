"use client";

import { useEffect, useRef } from 'react';

const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 seconds

// Safer implementation
export default function useImpressionTracker(listings = [], source = 'feed') {
  const observerRef = useRef(null);
  const trackedIds = useRef(new Set());
  const pendingImpressions = useRef([]);
  const flushTimer = useRef(null);

  // Define flushImpressions inside useEffect or useCallback if needed, 
  // but useRef is fine for stable function across renders if needed.
  // We'll keep it inline-like but careful about deps.

  useEffect(() => {
    // Flush function
    const flushImpressions = () => {
      if (pendingImpressions.current.length === 0) return;

      const batch = pendingImpressions.current.splice(0, pendingImpressions.current.length);
      const eventType = source === 'search' ? 'search_appearance' : 'impression';

      // Send batch
      batch.forEach(id => {
         // Use a fire-and-forget fetch
         try {
             fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    listingId: id,
                    eventType: eventType,
                    eventData: { source }
                })
             }).catch(err => {
                 // Silent error or low-pri log
                 // console.warn('Track err', err)
             });
         } catch (e) {
             // Ignore
         }
      });
    };

    // Start timer
    flushTimer.current = setInterval(flushImpressions, FLUSH_INTERVAL);

    return () => {
      if (flushTimer.current) clearInterval(flushTimer.current);
      flushImpressions(); // Flush remaining on unmount
    };
  }, [source]);

  useEffect(() => {
    if (!listings || listings.length === 0) return;
    if (typeof window === 'undefined' || !window.IntersectionObserver) return;

    // Disconnect old
    if (observerRef.current) {
        observerRef.current.disconnect();
    }

    try {
        observerRef.current = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
              // Safe access to dataset
              const target = entry.target;
              if (!target) return;
              
              // We expect id like "listing-123", so we need to parse it or rely on data-id if we added it?
              // The logic below relies on `entry.target.dataset.id`.
              // BUT we attached `id="listing-{id}"`. 
              // `dataset.id` works if we have `data-id="..."`.
              // If we only have `id="..."`, we should parse it or add `data-id`.
              
              // Let's support both for safety.
              let id = target.dataset?.id; 
              if (!id && target.id && target.id.startsWith('listing-')) {
                  id = target.id.replace('listing-', '');
              }

              if (id && !trackedIds.current.has(id)) {
                trackedIds.current.add(id);
                pendingImpressions.current.push(id);
                
                // If batch is full, flush checks?
                // We can't easily call valid flush here unless we ref it.
                // But timer handles it mostly. 
                // Let's simple check length
                if (pendingImpressions.current.length >= BATCH_SIZE) {
                   // Ideally call flush. 
                   // For now, let's rely on timer to avoid complexity of closures.
                }
              }
            }
          });
        }, {
          threshold: 0.5,
          rootMargin: '0px'
        });

        listings.forEach(listing => {
           if (!listing || !listing.id) return;
           const el = document.getElementById(`listing-${listing.id}`);
           if (el) observerRef.current.observe(el);
        });

    } catch (err) {
        console.warn("IntersectionObserver setup error:", err);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [listings]);
}
