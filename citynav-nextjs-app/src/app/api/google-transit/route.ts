import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || '1000';

    if (!lat || !lng) {
      return NextResponse.json({ error: 'Missing lat/lng parameters' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    const location = `${lat},${lng}`;

    // Search for multiple transit types
    const transitTypes = ['bus_station', 'train_station', 'subway_station', 'transit_station'];
    
    const results = await Promise.all(
      transitTypes.map(async (type) => {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type}&key=${apiKey}`;
        const resp = await fetch(url);
        const data = await resp.json();
        return { type, results: data.results || [] };
      })
    );

    return NextResponse.json({ transitResults: results });
  } catch (error) {
    console.error('Google Transit proxy error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Proxy error' }, { status: 500 });
  }
}
