import { NextResponse } from 'next/server';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.location',
  'places.types',
  'places.rating',
].join(',');

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!query) {
      return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    const requestBody: Record<string, unknown> = {
      textQuery: query,
      maxResultCount: 10,
    };

    // Bias results near the user's location if provided
    if (lat && lng) {
      requestBody.locationBias = {
        circle: {
          center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
          radius: 10000,
        },
      };
    }

    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify(requestBody),
      },
    );

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({
        status: 'REQUEST_DENIED',
        error_message: data.error.message || JSON.stringify(data.error),
        results: [],
      });
    }

    const places = (data.places || []) as Array<{
      id?: string;
      displayName?: { text?: string };
      location?: { latitude?: number; longitude?: number };
      types?: string[];
      rating?: number;
      formattedAddress?: string;
      shortFormattedAddress?: string;
    }>;

    const results = places.map((place) => ({
      place_id: place.id || '',
      name: place.displayName?.text || '',
      lat: place.location?.latitude ?? 0,
      lng: place.location?.longitude ?? 0,
      types: place.types || [],
      rating: place.rating ?? undefined,
      address: place.shortFormattedAddress || place.formattedAddress || '',
    }));

    return NextResponse.json({ status: 'OK', results });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Proxy error' },
      { status: 500 },
    );
  }
}
