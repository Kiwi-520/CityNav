import { NextResponse } from 'next/server';

async function fetchWithRetry(
  url: string,
  maxRetries: number = 3,
  baseDelay: number = 500,
  timeoutMs: number = 8000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      lastError = error;
      const isRetryable =
        error.name === 'AbortError' ||
        error.cause?.code === 'ETIMEDOUT' ||
        error.cause?.code === 'ECONNRESET' ||
        error.cause?.code === 'ECONNREFUSED' ||
        error.message?.includes('fetch failed');

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff: 500ms, 1000ms, 2000ms...
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(
        `Google Geocoding fetch attempt ${attempt + 1} failed (${error.cause?.code || error.message}), retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const address = searchParams.get('address');

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    let url: string;

    if (lat && lng) {
      // Reverse geocoding
      url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    } else if (address) {
      // Forward geocoding
      url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    } else {
      return NextResponse.json({ error: 'Provide lat/lng or address parameter' }, { status: 400 });
    }

    const response = await fetchWithRetry(url);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    const isTimeout = error.cause?.code === 'ETIMEDOUT' || error.name === 'AbortError';
    console.error('Google Geocoding proxy error:', isTimeout ? 'Request timed out after retries' : error);
    return NextResponse.json(
      { error: isTimeout ? 'Geocoding request timed out. Please try again.' : (error.message || 'Proxy error') },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
