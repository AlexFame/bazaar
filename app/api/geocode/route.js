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

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BazaarApp/1.0 (alexeypavlov@example.com)', // Add contact info as per Nominatim policy
        'Accept-Language': 'ru,uk,en' // Prefer local languages
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Geocoding proxy error:', error);
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}
