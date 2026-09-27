"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CloudRain,
  Gauge,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Thermometer,
  Users,
  Wind,
} from "lucide-react";

/* ========================================================================== */
/* TYPES                                                                      */
/* ========================================================================== */

type ActivityType =
  | "home"
  | "hotel"
  | "beach"
  | "fort"
  | "restaurant"
  | "temple"
  | "waterfall"
  | "park"
  | "museum"
  | "sightseeing";

type Activity = {
  id: string;
  day: string;
  date: string | null;
  name: string;
  location: string | null;
  type: ActivityType;
};

type Scenario = {
  rainfall: number;
  temperature: number;
  storm: number;
  crowd: number;
  travel: number;
};

type SimulationStatus =
  | "Suitable"
  | "Minor Impact"
  | "Moderate"
  | "High Impact";

type SimulationResult = {
  status: SimulationStatus;
  icon: string;
  score: number;
  reason: string;
  dominantFactor: string;
};

type Trip = {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
};

type ItineraryItem = {
  id: string;
  trip_id: string;
  title: string;
  item_date: string | null;
  location: string | null;
  type: string | null;
};

type LiveWeather = {
  current?: {
    temperature?: number | null;
    precipitation?: number | null;
    windSpeed?: number | null;
  };
  daily?: {
    precipitationProbability?: number[];
    max?: number[];
    min?: number[];
  };
};

type LiveResponse = {
  weather: LiveWeather | null;
};

/* ========================================================================== */
/* ACTIVITY MODEL                                                             */
/* ========================================================================== */

const activityKeywords: Record<ActivityType, string[]> = {
  home: ["home", "house", "apartment", "flat", "room"],
  hotel: ["hotel", "resort", "homestay", "villa", "lodge", "stay"],
  beach: ["beach", "coast", "sea", "shore", "marine"],
  fort: ["fort", "castle", "palace", "monument"],
  restaurant: [
    "restaurant",
    "cafe",
    "café",
    "food",
    "dinner",
    "lunch",
    "breakfast",
    "eat",
  ],
  temple: [
    "temple",
    "mandir",
    "church",
    "mosque",
    "gurudwara",
    "shrine",
  ],
  waterfall: ["waterfall", "falls", "cascade"],
  park: ["park", "garden", "zoo", "botanical"],
  museum: ["museum", "gallery", "exhibition"],
  sightseeing: [
    "sightseeing",
    "city",
    "market",
    "visit",
    "explore",
    "tour",
    "shopping",
    "street",
  ],
};

const activityIcons: Record<ActivityType, string> = {
  home: "🏠",
  hotel: "🏨",
  beach: "🏖️",
  fort: "🏰",
  restaurant: "🍽️",
  temple: "🛕",
  waterfall: "💧",
  park: "🌳",
  museum: "🏛️",
  sightseeing: "📍",
};

const activityProfiles: Record<
  ActivityType,
  {
    rainSensitivity: number;
    heatSensitivity: number;
    stormSensitivity: number;
    crowdSensitivity: number;
    travelSensitivity: number;
    indoor: boolean;
  }
> = {
  home: {
    rainSensitivity: 0.02,
    heatSensitivity: 0.25,
    stormSensitivity: 0.12,
    crowdSensitivity: 0,
    travelSensitivity: 0.02,
    indoor: true,
  },
  hotel: {
    rainSensitivity: 0.08,
    heatSensitivity: 0.12,
    stormSensitivity: 0.2,
    crowdSensitivity: 0.1,
    travelSensitivity: 0.2,
    indoor: true,
  },
  beach: {
    rainSensitivity: 0.95,
    heatSensitivity: 0.45,
    stormSensitivity: 1,
    crowdSensitivity: 0.2,
    travelSensitivity: 0.35,
    indoor: false,
  },
  fort: {
    rainSensitivity: 0.7,
    heatSensitivity: 0.72,
    stormSensitivity: 0.82,
    crowdSensitivity: 0.3,
    travelSensitivity: 0.3,
    indoor: false,
  },
  restaurant: {
    rainSensitivity: 0.15,
    heatSensitivity: 0.1,
    stormSensitivity: 0.22,
    crowdSensitivity: 0.78,
    travelSensitivity: 0.18,
    indoor: true,
  },
  temple: {
    rainSensitivity: 0.42,
    heatSensitivity: 0.42,
    stormSensitivity: 0.5,
    crowdSensitivity: 0.62,
    travelSensitivity: 0.25,
    indoor: false,
  },
  waterfall: {
    rainSensitivity: 0.82,
    heatSensitivity: 0.18,
    stormSensitivity: 1,
    crowdSensitivity: 0.15,
    travelSensitivity: 0.65,
    indoor: false,
  },
  park: {
    rainSensitivity: 0.78,
    heatSensitivity: 0.72,
    stormSensitivity: 0.82,
    crowdSensitivity: 0.25,
    travelSensitivity: 0.25,
    indoor: false,
  },
  museum: {
    rainSensitivity: 0.04,
    heatSensitivity: 0.04,
    stormSensitivity: 0.08,
    crowdSensitivity: 0.85,
    travelSensitivity: 0.12,
    indoor: true,
  },
  sightseeing: {
    rainSensitivity: 0.58,
    heatSensitivity: 0.58,
    stormSensitivity: 0.68,
    crowdSensitivity: 0.45,
    travelSensitivity: 0.45,
    indoor: false,
  },
};

function detectActivityType(text: string): ActivityType {
  const lowerText = text.toLowerCase();
  const orderedTypes: ActivityType[] = [
    "home",
    "hotel",
    "beach",
    "waterfall",
    "restaurant",
    "museum",
    "temple",
    "fort",
    "park",
    "sightseeing",
  ];

  for (const type of orderedTypes) {
    if (activityKeywords[type].some((keyword) => lowerText.includes(keyword))) {
      return type;
    }
  }

  return "sightseeing";
}

function calculateResult(
  activity: Activity,
  scenario: Scenario
): SimulationResult {
  const profile = activityProfiles[activity.type];

  const rainImpact = (scenario.rainfall / 100) * profile.rainSensitivity;
  const stormImpact = (scenario.storm / 12) * profile.stormSensitivity;
  const crowdImpact = (scenario.crowd / 100) * profile.crowdSensitivity;
  const travelImpact = (scenario.travel / 100) * profile.travelSensitivity;

  let heatImpact = 0;
  if (scenario.temperature > 32) {
    heatImpact = Math.min((scenario.temperature - 32) / 13, 1) * profile.heatSensitivity;
  } else if (scenario.temperature < 18) {
    heatImpact = Math.min((18 - scenario.temperature) / 18, 1) * profile.heatSensitivity;
  }

  let score =
    (rainImpact * 0.32 +
      heatImpact * 0.18 +
      stormImpact * 0.22 +
      crowdImpact * 0.13 +
      travelImpact * 0.15) *
    100;

  if (profile.indoor && scenario.rainfall >= 70 && scenario.storm < 8 && scenario.crowd < 85) {
    score = Math.min(score, 18);
  }

  if (activity.type === "home") {
    score *= 0.5;
  }

  const factors = [
    { name: "rainfall", value: rainImpact },
    { name: "storm conditions", value: stormImpact },
    { name: "temperature", value: heatImpact },
    { name: "crowding", value: crowdImpact },
    { name: "travel difficulty", value: travelImpact },
  ].filter((factor) => factor.value > 0);

  const strongestFactor =
    factors.sort((a, b) => b.value - a.value)[0]?.name || "current conditions";

  if (score < 15) {
    return {
      status: "Suitable",
      icon: "🟢",
      score,
      dominantFactor: strongestFactor,
      reason: profile.indoor
        ? "This activity is mostly indoors, so the simulated outdoor conditions have limited effect."
        : "The simulated conditions have little meaningful effect on this activity.",
    };
  }

  if (score < 32) {
    return {
      status: "Minor Impact",
      icon: "🟡",
      score,
      dominantFactor: strongestFactor,
      reason: `There is a small effect mainly from ${strongestFactor}, but the activity can generally continue.`,
    };
  }

  if (score < 58) {
    return {
      status: "Moderate",
      icon: "🟠",
      score,
      dominantFactor: strongestFactor,
      reason: `The main consideration is ${strongestFactor}. Timing or preparation may need adjustment.`,
    };
  }

  return {
    status: "High Impact",
    icon: "🔴",
    score,
    dominantFactor: strongestFactor,
    reason: `The activity is significantly affected by ${strongestFactor}. TripWise should consider an alternative timing, route or activity.`,
  };
}

function statusClasses(status: SimulationStatus) {
  switch (status) {
    case "Suitable":
      return "border-[#d4dfd2] bg-[#f3f8f1]";
    case "Minor Impact":
      return "border-[#e2dfc5] bg-[#faf9ed]";
    case "Moderate":
      return "border-[#e6d8bf] bg-[#fbf6eb]";
    case "High Impact":
      return "border-[#e4cccc] bg-[#fbf0f0]";
  }
}

function formatDate(value: string | null) {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function dayNumber(date: string | null, startDate: string | null) {
  if (!date || !startDate) return null;
  const start = new Date(`${startDate}T00:00:00`);
  const current = new Date(`${date}T00:00:00`);
  const diff = Math.round((current.getTime() - start.getTime()) / 86400000);
  return diff >= 0 ? diff + 1 : null;
}

function defaultScenario(weather: LiveWeather | null): Scenario {
  const probabilities = weather?.daily?.precipitationProbability ?? [];
  const maxTemps = weather?.daily?.max ?? [];
  const avgRain = probabilities.length
    ? probabilities.reduce((sum, value) => sum + Number(value || 0), 0) / probabilities.length
    : 25;
  const avgTemp = maxTemps.length
    ? maxTemps.reduce((sum, value) => sum + Number(value || 0), 0) / maxTemps.length
    : weather?.current?.temperature ?? 30;

  return {
    rainfall: Math.round(avgRain),
    temperature: Math.round(avgTemp),
    storm: 1,
    crowd: 30,
    travel: 20,
  };
}

/* ========================================================================== */
/* PAGE                                                                       */
/* ========================================================================== */

export default function DigitalTwinPage() {
  const params = useParams<{ tripId: string }>();
  const tripId = String(params?.tripId || "");

  const [trip, setTrip] = useState<Trip | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [weather, setWeather] = useState<LiveWeather | null>(null);
  const [scenario, setScenario] = useState<Scenario>({
    rainfall: 25,
    temperature: 30,
    storm: 1,
    crowd: 30,
    travel: 20,
  });
  const [baseline, setBaseline] = useState(scenario);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeDay, setActiveDay] = useState("All");

  const loadData = useCallback(async (refresh = false) => {
    if (!tripId) return;

    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const supabase = getSupabase();

      const [tripResult, itineraryResponse, liveResponse] = await Promise.all([
        supabase
          .from("trips")
          .select("id, name, destination, start_date, end_date")
          .eq("id", tripId)
          .maybeSingle(),
        fetch(`/api/trip/${tripId}/itinerary`, { cache: "no-store" }),
        fetch(`/api/trip/${tripId}/live`, { cache: "no-store" }),
      ]);

      if (tripResult.error) {
        throw tripResult.error;
      }

      if (!tripResult.data) {
        throw new Error("Trip not found.");
      }

      const itineraryPayload = await itineraryResponse.json();
      const livePayload: LiveResponse = await liveResponse.json();

      if (!itineraryResponse.ok) {
        throw new Error(itineraryPayload?.error || "Unable to load this trip's itinerary.");
      }

      setTrip(tripResult.data as Trip);

      const loadedItinerary = Array.isArray(itineraryPayload?.items)
        ? (itineraryPayload.items as ItineraryItem[])
        : [];
      setItinerary(loadedItinerary);

      const loadedWeather = liveResponse.ok ? livePayload?.weather ?? null : null;
      setWeather(loadedWeather);

      const nextBaseline = defaultScenario(loadedWeather);
      setBaseline(nextBaseline);
      setScenario(nextBaseline);
    } catch (err) {
      console.error("Digital Twin loading error:", err);
      setError(err instanceof Error ? err.message : "Unable to load Digital Twin data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activities = useMemo<Activity[]>(() => {
    return itinerary.map((item, index) => {
      const number = dayNumber(item.item_date, trip?.start_date || null);
      const day = number ? `Day ${number}` : `Day ${index + 1}`;
      const searchable = `${item.title} ${item.location || ""} ${item.type || ""}`;

      return {
        id: item.id,
        day,
        date: item.item_date,
        name: item.title,
        location: item.location,
        type: detectActivityType(searchable),
      };
    });
  }, [itinerary, trip?.start_date]);

  const days = useMemo(
    () => Array.from(new Set(activities.map((activity) => activity.day))),
    [activities]
  );

  const visibleActivities = useMemo(
    () =>
      activeDay === "All"
        ? activities
        : activities.filter((activity) => activity.day === activeDay),
    [activities, activeDay]
  );

  const results = useMemo(
    () => activities.map((activity) => ({ activity, result: calculateResult(activity, scenario) })),
    [activities, scenario]
  );

  const impactedCount = results.filter(
    ({ result }) => result.status === "Moderate" || result.status === "High Impact"
  ).length;
  const highImpactCount = results.filter(({ result }) => result.status === "High Impact").length;
  const averageScore = results.length
    ? results.reduce((sum, item) => sum + item.result.score, 0) / results.length
    : 0;
  const resilience = Math.max(0, Math.round(100 - averageScore));

  const suggestions = useMemo(() => {
    const list: string[] = [];

    results.forEach(({ activity, result }) => {
      if (result.status === "High Impact") {
        if (activity.type === "beach") {
          list.push(`${activity.day}: Consider replacing ${activity.name} with an indoor activity or moving it to a lower-rain period.`);
        } else if (activity.type === "waterfall") {
          list.push(`${activity.day}: Reconsider ${activity.name} if storm duration or rainfall increases.`);
        } else if (activity.type === "fort" || activity.type === "park") {
          list.push(`${activity.day}: Consider an earlier/later slot for ${activity.name} to reduce outdoor exposure.`);
        } else {
          list.push(`${activity.day}: Consider changing the timing or route for ${activity.name}.`);
        }
      } else if (result.status === "Moderate" && list.length < 5) {
        list.push(`${activity.day}: ${activity.name} may benefit from a timing adjustment because of ${result.dominantFactor}.`);
      }
    });

    return Array.from(new Set(list)).slice(0, 5);
  }, [results]);

  function updateScenario(key: keyof Scenario, value: number) {
    setScenario((current) => ({ ...current, [key]: value }));
  }

  function resetScenario() {
    setScenario(baseline);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f1e7] text-[#302b25]">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto animate-spin" size={28} />
            <p className="mt-4 text-sm text-[#746a60]">Building your trip&apos;s Digital Twin…</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f1e7] text-[#302b25]">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/trip/${tripId}`}
            className="inline-flex items-center gap-2 rounded-full border border-[#cfc4b5] bg-white px-4 py-2 text-xs font-semibold hover:bg-[#eee8df]"
          >
            <ArrowLeft size={14} />
            Back to trip
          </Link>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-full border border-[#cfc4b5] bg-white px-4 py-2 text-xs font-semibold hover:bg-[#eee8df] disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh live baseline
          </button>
        </div>

        <section className="mb-7 overflow-hidden rounded-[32px] border border-[#cfc4b5] bg-[#203a31] p-6 text-[#f3efe5] md:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#c7d1c4]">
                TripWise Intelligence · What-if simulation
              </p>
              <h1 className="mt-2 font-serif text-4xl tracking-[-.04em] md:text-6xl">
                Digital Twin
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#cbd3cd]">
                A virtual copy of this trip. Change environmental conditions here and
                TripWise recalculates the simulated impact without modifying the real itinerary.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs">
              <p className="font-bold">{trip?.name || "Trip"}</p>
              <p className="mt-1 text-white/60">
                {trip?.destination || "Destination not set"}
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#9a5b52]/20 bg-[#fff6f3] px-5 py-4 text-sm text-[#7d4942]">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <section className="mb-7 rounded-[30px] border border-[#ddd2c4] bg-white p-5 md:p-7">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927d67]">
                Scenario controls
              </p>
              <h2 className="mt-1 font-serif text-2xl">Test a different future</h2>
              <p className="mt-2 max-w-2xl text-xs leading-6 text-[#81766b]">
                These controls affect only the virtual model. Your saved itinerary, expenses and
                bookings remain unchanged.
              </p>
            </div>

            <button
              type="button"
              onClick={resetScenario}
              className="inline-flex items-center gap-2 self-start rounded-full border border-[#cfc4b5] bg-[#faf8f4] px-4 py-2 text-xs font-semibold hover:bg-[#eee8df]"
            >
              <RotateCcw size={13} />
              Reset baseline
            </button>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            <ScenarioSlider
              icon={<CloudRain size={16} />}
              label="Rainfall probability"
              value={scenario.rainfall}
              min={0}
              max={100}
              unit="%"
              onChange={(value) => updateScenario("rainfall", value)}
            />
            <ScenarioSlider
              icon={<Thermometer size={16} />}
              label="Temperature"
              value={scenario.temperature}
              min={0}
              max={45}
              unit="°C"
              onChange={(value) => updateScenario("temperature", value)}
            />
            <ScenarioSlider
              icon={<Wind size={16} />}
              label="Storm duration"
              value={scenario.storm}
              min={0}
              max={12}
              unit="h"
              onChange={(value) => updateScenario("storm", value)}
            />
            <ScenarioSlider
              icon={<Users size={16} />}
              label="Crowd level"
              value={scenario.crowd}
              min={0}
              max={100}
              unit="%"
              onChange={(value) => updateScenario("crowd", value)}
            />
            <ScenarioSlider
              icon={<Gauge size={16} />}
              label="Travel difficulty"
              value={scenario.travel}
              min={0}
              max={100}
              unit="%"
              onChange={(value) => updateScenario("travel", value)}
            />
          </div>
        </section>

        <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TwinMetric icon={<Activity size={18} />} label="Activities modeled" value={String(activities.length)} detail="Loaded from this trip" />
          <TwinMetric icon={<AlertTriangle size={18} />} label="Impacted" value={String(impactedCount)} detail="Moderate or high impact" />
          <TwinMetric icon={<CheckCircle2 size={18} />} label="Trip resilience" value={`${resilience}%`} detail="Higher means lower simulated impact" />
          <TwinMetric icon={<Sparkles size={18} />} label="High impact" value={String(highImpactCount)} detail="Activities needing attention" />
        </section>

        {weather && (
          <section className="mb-7 rounded-[26px] border border-[#ddd2c4] bg-[#eee8df] p-5">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
              <span className="font-bold uppercase tracking-[.16em] text-[#927d67]">Live baseline</span>
              <span className="flex items-center gap-2"><Thermometer size={14} /> {weather.current?.temperature ?? "—"}°C</span>
              <span className="flex items-center gap-2"><CloudRain size={14} /> {weather.current?.precipitation ?? "—"} mm current precipitation</span>
              <span className="flex items-center gap-2"><Wind size={14} /> {weather.current?.windSpeed ?? "—"} km/h</span>
              <span className="text-[#81766b]">Sliders start from this forecast where available.</span>
            </div>
          </section>
        )}

        {days.length > 0 && (
          <div className="mb-4 flex gap-2 overflow-x-auto">
            <DayButton active={activeDay === "All"} onClick={() => setActiveDay("All")}>All days</DayButton>
            {days.map((day) => (
              <DayButton key={day} active={activeDay === day} onClick={() => setActiveDay(day)}>{day}</DayButton>
            ))}
          </div>
        )}

        <section className="overflow-hidden rounded-[30px] border border-[#cfc4b5] bg-[#fbfaf7]">
          <div className="border-b border-[#ddd3c6] px-5 py-5 md:px-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927d67]">Virtual trip state</p>
                <h2 className="mt-1 font-serif text-2xl">Simulated itinerary impact</h2>
              </div>
              <span className="hidden rounded-full bg-[#eee8df] px-3 py-1.5 text-[10px] font-bold text-[#6f675e] sm:inline-flex">
                Scenario updates instantly
              </span>
            </div>
          </div>

          {visibleActivities.length === 0 ? (
            <div className="p-10 text-center">
              <CalendarDays className="mx-auto text-[#927d67]" size={24} />
              <p className="mt-3 text-sm font-semibold">No itinerary activities yet.</p>
              <p className="mt-1 text-xs text-[#81766b]">Add activities to the trip itinerary and return here.</p>
              <Link
                href={`/trip/${tripId}/itinerary`}
                className="mt-4 inline-flex rounded-full bg-[#302b25] px-4 py-2 text-xs font-bold text-white"
              >
                Open itinerary
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#e0d7cb]">
              {visibleActivities.map((activity) => {
                const result = calculateResult(activity, scenario);
                return (
                  <div key={activity.id} className="p-5 md:p-7">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eee8df] text-2xl">
                          {activityIcons[activity.type]}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#927d67]">{activity.day}</span>
                            <span className="rounded-full bg-[#eee8df] px-2 py-1 text-[10px] font-semibold capitalize text-[#6f675e]">{activity.type}</span>
                          </div>
                          <h3 className="mt-1 truncate text-base font-bold">{activity.name}</h3>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#81766b]">
                            <span className="flex items-center gap-1"><CalendarDays size={12} /> {formatDate(activity.date)}</span>
                            {activity.location && <span className="flex items-center gap-1"><MapPin size={12} /> {activity.location}</span>}
                          </div>
                        </div>
                      </div>

                      <div className={`rounded-2xl border px-4 py-3 lg:min-w-[270px] ${statusClasses(result.status)}`}>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm font-bold">{result.icon} {result.status}</span>
                          <span className="text-xs font-bold">{Math.round(result.score)}/100 impact</span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-[#6f675e]">{result.reason}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-7 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-[28px] border border-[#ddd2c4] bg-white p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eee8df] text-[#927d67]">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#927d67]">Adaptation suggestions</p>
                <h3 className="mt-1 font-serif text-2xl">What the virtual model suggests</h3>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {suggestions.length ? (
                suggestions.map((suggestion) => (
                  <div key={suggestion} className="rounded-2xl bg-[#f4efe7] px-4 py-3 text-sm leading-6 text-[#5f574e]">
                    {suggestion}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-[#f3f8f1] px-4 py-3 text-sm leading-6 text-[#566653]">
                  The simulated conditions do not currently require a major itinerary adaptation.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#ddd2c4] bg-[#eee8df] p-6">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#927d67]">How this works</p>
            <div className="mt-5 space-y-4 text-sm leading-6 text-[#6f675e]">
              <div><b className="text-[#302b25]">01 · Real trip</b><br />Activities are loaded from this trip&apos;s saved itinerary.</div>
              <div><b className="text-[#302b25]">02 · Scenario</b><br />You change weather, crowd and travel conditions in the virtual copy.</div>
              <div><b className="text-[#302b25]">03 · Propagation</b><br />Each activity responds according to its activity-specific sensitivity profile.</div>
              <div><b className="text-[#302b25]">04 · Adapt</b><br />TripWise identifies impacted activities and suggests timing, route or activity changes.</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ScenarioSlider({
  icon,
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-2xl border border-[#e0d7cb] bg-[#faf8f4] p-4">
      <span className="flex items-center justify-between gap-2 text-xs font-semibold text-[#5f574e]">
        <span className="flex items-center gap-2">{icon}{label}</span>
        <b>{value}{unit}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-4 w-full accent-[#302b25]"
      />
      <span className="mt-2 flex justify-between text-[10px] text-[#9a9186]">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </span>
    </label>
  );
}

function TwinMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#ddd2c4] bg-white p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eee8df] text-[#927d67]">
        {icon}
      </div>
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#927d67]">{label}</p>
      <p className="mt-1 font-serif text-3xl">{value}</p>
      <p className="mt-1 text-xs text-[#81766b]">{detail}</p>
    </div>
  );
}

function DayButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
        active
          ? "bg-[#302b25] text-white"
          : "bg-[#eee8df] text-[#5f554b] hover:bg-[#e2dbcf]"
      }`}
    >
      {children}
    </button>
  );
}
