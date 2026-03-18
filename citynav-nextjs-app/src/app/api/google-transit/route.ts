import { NextResponse } from 'next/server';

const TRANSIT_TYPES = ['bus_station', 'train_station', 'subway_station', 'transit_station'] as const;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get('lat'));
    const lng = Number(searchParams.get('lng'));
    const radius = Math.min(Number(searchParams.get('radius') || '1000'), 50000);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'Missing or invalid lat/lng parameters' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    const location = `${lat},${lng}`;

    // Search for multiple transit types
    const settled = await Promise.allSettled(
      TRANSIT_TYPES.map(async (type) => {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type}&key=${apiKey}`;
        const resp = await fetch(url);
        if (!resp.ok) {
          return { type, results: [] };
        }
        const data = await resp.json();
        return { type, results: data.results || [] };
      })
    );

    const transitResults = settled
      .filter((result): result is PromiseFulfilledResult<{ type: string; results: unknown[] }> => result.status === 'fulfilled')
      .map((result) => result.value);

    return NextResponse.json({
      status: transitResults.some((group) => group.results.length > 0) ? 'OK' : 'ZERO_RESULTS',
      transitResults,
    });
  } catch (error) {
    console.error('Google Transit proxy error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Proxy error', transitResults: [] }, { status: 500 });
  }
}
