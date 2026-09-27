import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/* ========================================================================== */
/* TYPES                                                                      */
/* ========================================================================== */

type GeoResult = {
  name?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  country?: string;
  country_code?: string;
  admin1?: string;
};

type NewsItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
  description: string;
};

type SocialPost = {
  uri: string;
  text: string;
  authorName: string;
  authorHandle: string;
  createdAt: string | null;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  url: string;
};

/* ========================================================================== */
/* HELPERS                                                                    */
/* ========================================================================== */

function cleanText(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block: string, tag: string) {
  const regex = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );

  const match = block.match(regex);

  return match?.[1] ? cleanText(match[1]) : "";
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );
}

function formatGoogleNewsQuery(destination: string) {
  return `"${destination}"`;
}

function safeDate(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

/* ========================================================================== */
/* GOOGLE NEWS RSS                                                            */
/* ========================================================================== */

async function fetchNews(
  destination: string
): Promise<NewsItem[]> {
  try {
    const query = encodeURIComponent(
      formatGoogleNewsQuery(destination)
    );

    const url =
      `https://news.google.com/rss/search?q=${query}` +
      `&hl=en-IN&gl=IN&ceid=IN:en`;

    const response = await fetch(url, {
      headers: {
        Accept:
          "application/rss+xml, application/xml, text/xml",
        "User-Agent":
          "TripWise/1.0 live travel dashboard",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        "Google News request failed:",
        response.status,
        response.statusText
      );

      return [];
    }

    const xml = await response.text();

    const itemBlocks =
      xml.match(
        /<item\b[^>]*>[\s\S]*?<\/item>/gi
      ) || [];

    return itemBlocks
      .slice(0, 8)
      .map((block) => {
        const title =
          extractTag(block, "title");

        const link =
          extractTag(block, "link");

        const description =
          extractTag(
            block,
            "description"
          );

        const source =
          extractTag(
            block,
            "source"
          ) || "News";

        const published =
          extractTag(
            block,
            "pubDate"
          );

        return {
          title:
            decodeXml(title) ||
            "Untitled article",

          link:
            decodeXml(link),

          source:
            decodeXml(source) ||
            "News",

          publishedAt:
            safeDate(published),

          description:
            decodeXml(description),
        };
      })
      .filter(
        (item) =>
          item.title &&
          item.link
      );
  } catch (error) {
    console.error(
      "Google News fetch failed:",
      error
    );

    return [];
  }
}

/* ========================================================================== */
/* BLUESKY PUBLIC SOCIAL SEARCH                                               */
/* ========================================================================== */

async function fetchSocial(
  destination: string
): Promise<SocialPost[]> {
  try {
    const query = encodeURIComponent(
      destination
    );

    const url =
      `https://public.api.bsky.app/xrpc/` +
      `app.bsky.feed.searchPosts` +
      `?q=${query}` +
      `&limit=10` +
      `&sort=latest`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        "Bluesky request failed:",
        response.status,
        response.statusText
      );

      return [];
    }

    const data =
      await response.json();

    const posts =
      Array.isArray(data?.posts)
        ? data.posts
        : [];

    return posts
      .slice(0, 8)
      .map((post: any) => {
        const author =
          post?.author || {};

        const record =
          post?.record || {};

        const handle =
          author?.handle ||
          "";

        const rkey =
          typeof post?.uri === "string"
            ? post.uri.split("/").pop()
            : "";

        const did =
          author?.did || "";

        const url =
          handle && rkey
            ? `https://bsky.app/profile/${handle}/post/${rkey}`
            : did && rkey
            ? `https://bsky.app/profile/${did}/post/${rkey}`
            : "https://bsky.app";

        return {
          uri:
            post?.uri || "",

          text:
            record?.text || "",

          authorName:
            author?.displayName ||
            handle ||
            "Bluesky user",

          authorHandle:
            handle
              ? `@${handle}`
              : "",

          createdAt:
            safeDate(
              record?.createdAt ||
                null
            ),

          likeCount:
            Number(
              post?.likeCount || 0
            ),

          repostCount:
            Number(
              post?.repostCount || 0
            ),

          replyCount:
            Number(
              post?.replyCount || 0
            ),

          url,
        };
      })
      .filter(
        (post: SocialPost) =>
          post.text
      );
  } catch (error) {
    console.error(
      "Bluesky fetch failed:",
      error
    );

    return [];
  }
}

/* ========================================================================== */
/* WEATHER                                                                    */
/* ========================================================================== */

async function fetchWeather(
  destination: string,
  startDate: string | null,
  endDate: string | null
) {
  try {
    /*
     * STEP 1:
     * Convert the trip destination into coordinates.
     */

    const geoUrl =
      `https://geocoding-api.open-meteo.com/v1/search` +
      `?name=${encodeURIComponent(destination)}` +
      `&count=5` +
      `&language=en` +
      `&format=json`;

    console.log(
      "Weather geocoding request:",
      geoUrl
    );

    const geoResponse =
      await fetch(geoUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "TripWise/1.0 weather service",
        },
        cache: "no-store",
      });

    if (!geoResponse.ok) {
      const errorBody =
        await geoResponse.text();

      console.error(
        "Open-Meteo geocoding failed:",
        {
          status:
            geoResponse.status,

          statusText:
            geoResponse.statusText,

          body:
            errorBody,
        }
      );

      throw new Error(
        `Unable to locate destination (${geoResponse.status})`
      );
    }

    const geoData =
      await geoResponse.json();

    const results: GeoResult[] =
      Array.isArray(
        geoData?.results
      )
        ? geoData.results
        : [];

    const location =
      results[0];

    if (
      !location ||
      typeof location.latitude !==
        "number" ||
      typeof location.longitude !==
        "number"
    ) {
      console.error(
        "Open-Meteo returned no usable location:",
        {
          destination,
          geoData,
        }
      );

      throw new Error(
        "Destination could not be located."
      );
    }

    const latitude =
      location.latitude;

    const longitude =
      location.longitude;

    console.log(
      "Weather coordinates:",
      {
        destination,
        latitude,
        longitude,
      }
    );

    /*
     * STEP 2:
     * Fetch the actual weather forecast.
     */

    const forecastUrl =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${encodeURIComponent(
        String(latitude)
      )}` +
      `&longitude=${encodeURIComponent(
        String(longitude)
      )}` +
      `&timezone=auto` +
      `&forecast_days=16` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,sunrise,sunset`;

    console.log(
      "Weather forecast request:",
      forecastUrl
    );

    const weatherResponse =
      await fetch(
        forecastUrl,
        {
          headers: {
            Accept:
              "application/json",
            "User-Agent":
              "TripWise/1.0 weather service",
          },
          cache: "no-store",
        }
      );

    if (!weatherResponse.ok) {
      const errorBody =
        await weatherResponse.text();

      console.error(
        "Open-Meteo weather API failed:",
        {
          status:
            weatherResponse.status,

          statusText:
            weatherResponse.statusText,

          body:
            errorBody,

          latitude,
          longitude,
        }
      );

      throw new Error(
        `Weather service unavailable (${weatherResponse.status})`
      );
    }

    const weather =
      await weatherResponse.json();

    /*
     * STEP 3:
     * Validate that Open-Meteo actually returned
     * the expected weather structure.
     */

    if (
      !weather ||
      typeof weather !== "object"
    ) {
      console.error(
        "Open-Meteo returned invalid weather data:",
        weather
      );

      throw new Error(
        "Invalid weather response."
      );
    }

    console.log(
      "Weather successfully fetched:",
      {
        destination,
        latitude,
        longitude,
        timezone:
          weather?.timezone,
      }
    );

    /*
     * STEP 4:
     * Return the same structure expected
     * by the existing Trip Overview page.
     */

    return {
      location: {
        name:
          location.name ||
          destination,

        country:
          location.country ||
          "",

        countryCode:
          location.country_code ||
          "",

        admin1:
          location.admin1 ||
          "",

        latitude,

        longitude,

        timezone:
          location.timezone ||
          weather.timezone ||
          "UTC",
      },

      current: {
        temperature:
          weather?.current
            ?.temperature_2m ??
          null,

        apparentTemperature:
          weather?.current
            ?.apparent_temperature ??
          null,

        humidity:
          weather?.current
            ?.relative_humidity_2m ??
          null,

        precipitation:
          weather?.current
            ?.precipitation ??
          null,

        weatherCode:
          weather?.current
            ?.weather_code ??
          null,

        windSpeed:
          weather?.current
            ?.wind_speed_10m ??
          null,
      },

      daily: {
        time:
          weather?.daily?.time ||
          [],

        weatherCode:
          weather?.daily
            ?.weather_code ||
          [],

        max:
          weather?.daily
            ?.temperature_2m_max ||
          [],

        min:
          weather?.daily
            ?.temperature_2m_min ||
          [],

        precipitationProbability:
          weather?.daily
            ?.precipitation_probability_max ||
          [],

        precipitation:
          weather?.daily
            ?.precipitation_sum ||
          [],

        wind:
          weather?.daily
            ?.wind_speed_10m_max ||
          [],

        sunrise:
          weather?.daily?.sunrise ||
          [],

        sunset:
          weather?.daily?.sunset ||
          [],
      },

      tripForecast: {
        startDate,
        endDate,
      },

      fetchedAt:
        new Date().toISOString(),
    };
  } catch (error) {
    console.error(
      "Weather fetch failed:",
      {
        destination,
        startDate,
        endDate,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      }
    );

    /*
     * Keep the existing API behavior:
     * weather becomes null instead of
     * breaking the entire Trip Overview page.
     */
    return null;
  }
}

/* ========================================================================== */
/* ROUTE                                                                      */
/* ========================================================================== */

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      tripId: string;
    }>;
  }
) {
  try {
    const { tripId } =
      await params;

    if (!tripId) {
      return NextResponse.json(
        {
          error:
            "Trip ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Supabase environment variables.
     */

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (
      !supabaseUrl ||
      !supabaseKey
    ) {
      console.error(
        "Supabase environment variables are missing."
      );

      return NextResponse.json(
        {
          error:
            "Supabase is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Create the authenticated Supabase server client.
     */

    const cookieStore =
      await cookies();

    const supabase =
      createServerClient(
        supabaseUrl,
        supabaseKey,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },

            setAll(
              cookiesToSet
            ) {
              try {
                cookiesToSet.forEach(
                  ({
                    name,
                    value,
                    options,
                  }) => {
                    cookieStore.set(
                      name,
                      value,
                      options
                    );
                  }
                );
              } catch {
                /*
                 * Cookie mutation may not always
                 * be available in this context.
                 *
                 * Reading the session still works.
                 */
              }
            },
          },
        }
      );

    /*
     * Check authentication.
     */

    const {
      data: {
        user,
      },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (
      authError ||
      !user
    ) {
      console.error(
        "Live trip authentication failed:",
        authError
      );

      return NextResponse.json(
        {
          error:
            "Please sign in first.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * Load the trip.
     */

    const {
      data: trip,
      error: tripError,
    } =
      await supabase
        .from("trips")
        .select(
          `
            id,
            name,
            destination,
            start_date,
            end_date
          `
        )
        .eq("id", tripId)
        .maybeSingle();

    if (tripError) {
      console.error(
        "Trip lookup failed:",
        tripError
      );

      return NextResponse.json(
        {
          error:
            tripError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!trip) {
      return NextResponse.json(
        {
          error:
            "Trip not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * If there is no destination,
     * return the trip successfully without
     * attempting external weather/news/social calls.
     */

    if (!trip.destination) {
      return NextResponse.json({
        trip: {
          id: trip.id,
          name: trip.name,
          destination: null,
        },

        weather: null,

        news: [],

        social: [],

        fetchedAt:
          new Date().toISOString(),
      });
    }

    console.log(
      "Loading live trip intelligence:",
      {
        tripId,
        destination:
          trip.destination,
        startDate:
          trip.start_date,
        endDate:
          trip.end_date,
      }
    );

    /*
     * Run weather, news and social requests
     * independently and in parallel.
     *
     * A failure in one source does not break
     * the other sources.
     */

    const [
      weather,
      news,
      social,
    ] = await Promise.all([
      fetchWeather(
        trip.destination,
        trip.start_date,
        trip.end_date
      ),

      fetchNews(
        trip.destination
      ),

      fetchSocial(
        trip.destination
      ),
    ]);

    console.log(
      "Live trip intelligence completed:",
      {
        tripId,

        weatherAvailable:
          Boolean(weather),

        newsCount:
          news.length,

        socialCount:
          social.length,
      }
    );

    return NextResponse.json({
      trip: {
        id: trip.id,

        name: trip.name,

        destination:
          trip.destination,

        startDate:
          trip.start_date,

        endDate:
          trip.end_date,
      },

      weather,

      news,

      social,

      fetchedAt:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Live trip API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load live trip information.",
      },
      {
        status: 500,
      }
    );
  }
}