// Utility function to track analytics events
export async function trackAnalyticsEvent(listingId, eventType, eventData = {}) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
