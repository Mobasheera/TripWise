import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      { error: "Missing location query." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
        query
      )}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "TripWise-Hackathon/1.0",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Geocoding service failed." },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({
        result: null,
      });
    }

    const lat = Number(data[0].lat);
    const lon = Number(data[0].lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({
        result: null,
      });
    }

    return NextResponse.json({
      result: {
        name: data[0].display_name,
        lat,
        lon,
      },
    });
  } catch (error) {
    console.error("Geocoding error:", error);

    return NextResponse.json(
      { error: "Unable to geocode location." },
      { status: 500 }
    );
  }
}