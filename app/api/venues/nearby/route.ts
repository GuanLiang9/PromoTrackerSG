import { NextResponse } from "next/server";
import { getNearbyVenues } from "@/lib/venues/nearby";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Generous SG + JB bounding box.
const BOUNDS = { minLat: 1.1, maxLat: 1.65, minLng: 103.4, maxLng: 104.2 };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (
    !Number.isFinite(lat) || !Number.isFinite(lng) ||
    lat < BOUNDS.minLat || lat > BOUNDS.maxLat ||
    lng < BOUNDS.minLng || lng > BOUNDS.maxLng
  ) {
    return NextResponse.json({ venues: [], area: null }, { status: 200 });
  }

  try {
    const result = await getNearbyVenues(lat, lng);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return NextResponse.json({ venues: [], area: null }, { status: 200 });
  }
}
