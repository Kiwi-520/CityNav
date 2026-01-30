import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fromLat = searchParams.get('fromLat');
    const fromLon = searchParams.get('fromLon');
    const toLat = searchParams.get('toLat');
    const toLon = searchParams.get('toLon');

    if (!fromLat || !fromLon || !toLat || !toLon) {
      return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
    }

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson&steps=true`;
    const resp = await fetch(osrmUrl);
    const body = await resp.text();
    const ct = resp.headers.get('Content-Type') || 'application/json';
    return new NextResponse(body, { status: resp.status, headers: { 'Content-Type': ct } });
  } catch (err) {
    console.error('OSRM proxy error', err);
    return NextResponse.json({ error: (err as Error).message || 'Proxy error' }, { status: 500 });
  }
}
