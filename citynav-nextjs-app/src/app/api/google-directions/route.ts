import { NextResponse } from 'next/server';

async function fetchWithRetry(
  url: string,
  maxRetries: number = 3,
  baseDelay: number = 500,
  timeoutMs: number = 10000
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
        error.message?.includes('fetch failed');

      if (!isRetryable || attempt === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`Directions fetch attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError || new Error('All retry attempts failed');
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fromLat = searchParams.get('fromLat');
    const fromLng = searchParams.get('fromLng');
    const toLat = searchParams.get('toLat');
    const toLng = searchParams.get('toLng');
    const mode = searchParams.get('mode') || 'driving'; // driving | walking | bicycling | transit
    const transitMode = searchParams.get('transit_mode'); // bus | subway | train | rail

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return NextResponse.json({ error: 'Missing coordinates (fromLat, fromLng, toLat, toLng)' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    const origin = `${fromLat},${fromLng}`;
    const destination = `${toLat},${toLng}`;
    
    // Build URL with departure_time=now for traffic-aware estimates
    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=${mode}&alternatives=true&key=${apiKey}`;
    
    // Add departure_time for real-time traffic data (driving & transit)
    if (mode === 'driving' || mode === 'transit') {
      url += `&departure_time=now`;
    }
    
    // Add transit_mode filter if specified
    if (mode === 'transit' && transitMode) {
      url += `&transit_mode=${transitMode}`;
    }

    const response = await fetchWithRetry(url);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Google Directions proxy error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Proxy error' }, { status: 500 });
  }
}
