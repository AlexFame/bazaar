import { NextResponse } from 'next/server';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const type = searchParams.get('type') || 'search'; // 'search' or 'reverse'

  if (!q && (!lat || !lon)) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    let url;
    const params = new URLSearchParams({
      format: 'json',
      addressdetails: '1',
      limit: '1'
    });

    if (type === 'reverse') {
      params.append('lat', lat);
      params.append('lon', lon);
      url = `${NOMINATIM_BASE_URL}/reverse?${params.toString()}`;
    } else {
      params.append('q', q);
      url = `${NOMINATIM_BASE_URL}/search?${params.toString()}`;
    }

    console.log('Geocoding request:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Bazaar/1.0 (https://bazaar.app; contact@bazaar.app)',
        'Referer': 'https://bazaar.app',
        'Accept-Language': 'ru,uk,en'
      }
    });

    console.log('Geocoding response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nominatim API error:', response.status, errorText);
      throw new Error(`Nominatim API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Geocoding data:', data);
    return NextResponse.json(data);

  } catch (error) {
    console.error('Geocoding proxy error:', error.message, error.stack);
    return NextResponse.json({ 
      error: 'Geocoding failed', 
      details: error.message 
    }, { status: 500 });
  }
}
