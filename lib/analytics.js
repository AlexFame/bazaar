// Utility function to track analytics events
export async function trackAnalyticsEvent(listingId, eventType, eventData = {}) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        listingId,
        eventType,
        eventData,
      }),
    });
  } catch (error) {
    // Silently fail - analytics shouldn't break user experience
    console.error('Analytics tracking failed:', error);
  }
}

export async function trackProductEvent(eventType, eventData = {}) {
  try {
    await fetch('/api/analytics/product/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        eventType,
        eventData,
      }),
    });
  } catch (error) {
    console.error('Product analytics tracking failed:', error);
  }
}
