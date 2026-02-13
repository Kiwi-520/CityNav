import { NextResponse } from 'next/server';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.location',
  'places.types',
  'places.rating',
  'places.businessStatus',
  'places.currentOpeningHours',
].join(',');

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || '1000';
    const type = searchParams.get('type') || '';

    if (!lat || !lng) {
      return NextResponse.json({ error: 'Missing lat/lng parameters' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    // ── Build request body for the new Nearby Search ──
    const requestBody: Record<string, unknown> = {
      locationRestriction: {
        circle: {
          center: {
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
          },
          radius: Math.min(parseFloat(radius), 50000), // max 50 km
        },
      },
      maxResultCount: 20, // max allowed by the API
    };

    if (type) {
      requestBody.includedTypes = [type];
    }

    // ── Call the Places API (New) ──
    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchNearby',
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

    // ── Handle API-level errors ──
    if (data.error) {
      const msg = data.error.message || JSON.stringify(data.error);
      return NextResponse.json({
        status: 'REQUEST_DENIED',
        error_message: msg,
        results: [],
      });
    }

    // ── Transform new response → legacy format ──
    const places = (data.places || []) as Array<{
      id?: string;
      displayName?: { text?: string };
      location?: { latitude?: number; longitude?: number };
      types?: string[];
      rating?: number;
      formattedAddress?: string;
      shortFormattedAddress?: string;
      businessStatus?: string;
      currentOpeningHours?: { openNow?: boolean };
    }>;
    const results = places.map((place) => ({
      place_id: place.id || '',
      name: place.displayName?.text || '',
      geometry: {
        location: {
          lat: place.location?.latitude,
          lng: place.location?.longitude,
        },
      },
      types: place.types || [],
      rating: place.rating ?? undefined,
      vicinity: place.shortFormattedAddress || place.formattedAddress || '',
      business_status: place.businessStatus || '',
      opening_hours: place.currentOpeningHours
        ? { open_now: place.currentOpeningHours.openNow ?? false }
        : undefined,
    }));

    return NextResponse.json({
      status: results.length > 0 ? 'OK' : 'ZERO_RESULTS',
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Proxy error' },
      { status: 500 },
    );
  }
}
