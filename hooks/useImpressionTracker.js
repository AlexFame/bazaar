import { useEffect, useRef } from 'react';

const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 seconds

export function useImpressionTracker(listings = [], source = 'feed') {
  const observerRef = useRef(null);
  const trackedIds = useRef(new Set());
  const pendingImpressions = useRef([]);
  const flushTimer = useRef(null);

  const flushImpressions = async () => {
    if (pendingImpressions.current.length === 0) return;

    const batch = pendingImpressions.current.splice(0, pendingImpressions.current.length);
    
    // We send each impression individually for now as our API expects single events,
    // but in a real high-load system we'd want a bulk insert endpoint.
    // To avoid browser connection limits, we'll use Promise.allSettled
    
    // Optimization: If we have many, maybe just send the last 20 to avoid flooding?
    // Or better, just loop.
    
    const eventType = source === 'search' ? 'search_appearance' : 'impression';

    // We can't easily batch with current API, so we'll just fire them.
    // Ideally, we should update API to accept arrays.
    // For now, let's just fire them.
    
    batch.forEach(id => {
       fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: id,
          eventType: eventType,
          eventData: { source }
        })
      }).catch(err => console.error('Impression track error', err));
    });
  };

  useEffect(() => {
    // Start flush timer
    flushTimer.current = setInterval(flushImpressions, FLUSH_INTERVAL);
    return () => clearInterval(flushTimer.current);
  }, []);

  useEffect(() => {
    if (!listings.length) return;

    // Disconnect old observer
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const id = entry.target.dataset.id;
          if (id && !trackedIds.current.has(id)) {
            trackedIds.current.add(id);
            pendingImpressions.current.push(id);
            
            // If batch is full, flush immediately
            if (pendingImpressions.current.length >= BATCH_SIZE) {
                flushImpressions();
            }
          }
        }
      });
    }, {
      threshold: 0.5, // 50% visible
      rootMargin: '0px'
    });

    // Observe all listing cards
    listings.forEach(listing => {
      const element = document.getElementById(`listing-${listing.id}`);
      if (element) observerRef.current.observe(element);
    });

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
      flushImpressions(); // Flush on unmount
    };
  }, [listings]); // Re-run when listings change
}
