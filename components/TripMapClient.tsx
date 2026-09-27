"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";

type TripMapProps = {
  destination?: string | null;
  locations?: string[];
};

type Coordinates = {
  lat: number;
  lon: number;
};

type LocationResult = {
  name: string;
  coordinates: Coordinates;
};

/**
 * Custom destination marker.
 */
const destinationIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #191a18;
      border: 4px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,.2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 17px;
    ">
      📍
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

/**
 * Custom itinerary location marker.
 */
const locationIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #6f796d;
      border: 3px solid white;
      box-shadow: 0 3px 10px rgba(0,0,0,.18);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 13px;
    ">
      •
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

/**
 * Geocode a location through our own Next.js API route.
 *
 * Keeping this request server-side means:
 * - no geocoding API key is exposed in the browser
 * - Render only needs to run the Next.js application
 * - the client always talks to our own /api/geocode endpoint
 */
async function geocodeLocation(
  location: string
): Promise<Coordinates | null> {
  try {
    const response = await fetch(
      `/api/geocode?q=${encodeURIComponent(location)}`
    );

    if (!response.ok) {
      console.error(
        `Geocoding request failed for "${location}" with status ${response.status}`
      );
      return null;
    }

    const data = await response.json();

    if (!data.result) {
      return null;
    }

    const lat = Number(data.result.lat);
    const lon = Number(data.result.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }

    return {
      lat,
      lon,
    };
  } catch (error) {
    console.error(
      `Unable to geocode location "${location}":`,
      error
    );

    return null;
  }
}

export default function TripMap({
  destination,
  locations = [],
}: TripMapProps) {
  const [mounted, setMounted] = useState(false);

  const [destinationCoordinates, setDestinationCoordinates] =
    useState<Coordinates | null>(null);

  const [locationResults, setLocationResults] = useState<
    LocationResult[]
  >([]);

  const [loading, setLoading] = useState(true);

  /**
   * Make sure the Leaflet map is only rendered in the browser.
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Load destination and itinerary coordinates.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadMapData() {
      if (!destination?.trim()) {
        setDestinationCoordinates(null);
        setLocationResults([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        /**
         * First geocode the main trip destination.
         */
        const destinationCoords =
          await geocodeLocation(destination);

        if (cancelled) {
          return;
        }

        if (!destinationCoords) {
          setDestinationCoordinates(null);
          setLocationResults([]);
          return;
        }

        setDestinationCoordinates(destinationCoords);

        /**
         * Remove:
         * - empty locations
         * - duplicate locations
         * - locations identical to the destination
         */
        const uniqueLocations = Array.from(
          new Set(
            locations
              .map((location) => location.trim())
              .filter(Boolean)
              .filter(
                (location) =>
                  location.toLowerCase() !==
                  destination.trim().toLowerCase()
              )
          )
        );

        const results: LocationResult[] = [];

        /**
         * Geocode each itinerary location.
         *
         * Requests are intentionally sequential to avoid
         * sending a large burst of requests to the geocoder.
         */
        for (const location of uniqueLocations) {
          if (cancelled) {
            return;
          }

          const coordinates =
            await geocodeLocation(location);

          if (coordinates) {
            results.push({
              name: location,
              coordinates,
            });
          }
        }

        if (!cancelled) {
          setLocationResults(results);
        }
      } catch (error) {
        console.error(
          "Trip map loading error:",
          error
        );

        if (!cancelled) {
          setDestinationCoordinates(null);
          setLocationResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMapData();

    return () => {
      cancelled = true;
    };
  }, [destination, locations]);

  /**
   * Prevent Leaflet from being evaluated/rendered before
   * the browser has mounted.
   */
  if (!mounted) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-[28px] border border-[#292a25]/10 bg-[#ebe8dc]">
        <span className="text-sm text-[#6c7168]">
          Loading trip map...
        </span>
      </div>
    );
  }

  const visibleLocationCount = destinationCoordinates
    ? 1 + locationResults.length
    : 0;

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#292a25]/10 bg-[#ebe8dc]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#292a25]/10 px-6 py-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#777d72]">
            Geospatial view
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#191a18]">
            Trip Map
          </h2>

          <p className="mt-1 text-sm text-[#6c7168]">
            {destination || "Trip destination"}
          </p>
        </div>

        <div className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#566055]">
          {visibleLocationCount}{" "}
          {visibleLocationCount === 1
            ? "location"
            : "locations"}
        </div>
      </div>

      {/* Map */}
      <div className="relative h-[420px]">
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-[#ebe8dc]">
            <div className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#566055] shadow-sm">
              Mapping trip locations...
            </div>
          </div>
        )}

        {!destinationCoordinates && !loading && (
          <div className="flex h-full items-center justify-center bg-[#dfe4dc] px-6 text-center">
            <div>
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                🗺️
              </div>

              <p className="font-semibold text-[#30352f]">
                Destination not found
              </p>

              <p className="mt-1 text-sm text-[#70766d]">
                Try using a more specific destination
                when creating the trip.
              </p>
            </div>
          </div>
        )}

        {destinationCoordinates && (
          <MapContainer
            center={[
              destinationCoordinates.lat,
              destinationCoordinates.lon,
            ]}
            zoom={12}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Trip destination */}
            <Marker
              position={[
                destinationCoordinates.lat,
                destinationCoordinates.lon,
              ]}
              icon={destinationIcon}
            >
              <Popup>
                <div className="min-w-[160px]">
                  <p className="font-bold">
                    {destination}
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    Trip destination
                  </p>
                </div>
              </Popup>
            </Marker>

            {/* Real itinerary locations */}
            {locationResults.map((location, index) => (
              <Marker
                key={`${location.name}-${index}`}
                position={[
                  location.coordinates.lat,
                  location.coordinates.lon,
                ]}
                icon={locationIcon}
              >
                <Popup>
                  <div className="min-w-[170px]">
                    <p className="font-bold">
                      {location.name}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      Itinerary location
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </section>
  );
}