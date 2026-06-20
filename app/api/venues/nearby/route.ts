import { NextResponse } from "next/server";
import { getNearbyVenues } from "@/lib/venues/nearby";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (
    !Number.isFinite(lat) || !Number.isFinite(lng) ||
    lat < -90 || lat > 90 || lng < -180 || lng > 180
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
