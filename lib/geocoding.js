"use client";

/**
 * Geocoding utilities using OpenStreetMap Nominatim
 * Free service with 1 request/second rate limit
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const RATE_LIMIT_MS = 1000; // 1 request per second

let lastRequestTime = 0;

/**
 * Rate limiter to respect Nominatim usage policy
 */
async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise(resolve => 
      setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest)
    );
  }
  
  lastRequestTime = Date.now();
}

/**
 * Geocode an address to coordinates via internal proxy
 * @param {string} address - Address to geocode
 * @returns {Promise<{lat: number, lng: number, display_name: string} | null>}
 */
export async function geocodeAddress(address) {
  if (!address || address.trim().length < 3) {
    return null;
  }

  try {
    await rateLimit();

    const params = new URLSearchParams({
      q: address,
      type: 'search'
    });

    const response = await fetch(`/api/geocode?${params}`);

    if (!response.ok) {
      console.error('Geocoding failed:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display_name: data[0].display_name,
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to address via internal proxy
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string | null>}
 */
export async function reverseGeocode(lat, lng) {
  if (!lat || !lng) {
    return null;
  }

  try {
    await rateLimit();

    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      type: 'reverse'
    });

    const response = await fetch(`/api/geocode?${params}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data || !data.address) {
      return null;
    }
    
    // Extract city name from address components
    // Priority: city > town > village > municipality > county
    const address = data.address;
    const cityName = 
      address.city || 
      address.town || 
      address.village || 
      address.municipality || 
      address.county ||
      address.state;
    
    return cityName || data.display_name || null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Get user's current location from browser
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export async function getUserLocation() {
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported');
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        resolve(null);
      },
      {
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
}

/**
 * Save user location to localStorage
 */
export function saveUserLocation(lat, lng) {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('userLocation', JSON.stringify({ lat, lng }));
}

/**
 * Get saved user location from localStorage
 */
export function getSavedUserLocation() {
  if (typeof window === 'undefined') return null;
  
  const saved = localStorage.getItem('userLocation');
  if (!saved) return null;
  
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

/**
 * Clear saved user location
 */
export function clearUserLocation() {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('userLocation');
}
