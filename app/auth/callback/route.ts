import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?error=missing_code",
        requestUrl.origin
      )
    );
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "Missing Supabase environment variables."
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=supabase_config",
        requestUrl.origin
      )
    );
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
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
          } catch (error) {
            console.error(
              "Could not set Supabase auth cookies:",
              error
            );
          }
        },
      },
    }
  );

  const {
    data: {
      user,
    },
    error,
  } =
    await supabase.auth.exchangeCodeForSession(
      code
    );

  if (error) {
    console.error(
      "Supabase OAuth exchange failed:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=oauth",
        requestUrl.origin
      )
    );
  }

  /*
   * Create the application profile immediately
   * after successful Google authentication.
   */
  if (user) {
    const metadata =
      user.user_metadata || {};

    const name =
      metadata.full_name ||
      metadata.name ||
      user.email?.split("@")[0] ||
      "Traveler";

    const avatarUrl =
      metadata.avatar_url ||
      metadata.picture ||
      null;

    const { data: existingProfile } =
      await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

    if (!existingProfile) {
      const { error: profileError } =
        await supabase
          .from("profiles")
          .insert({
            id: user.id,
            name,
            email: user.email || null,
            avatar_url: avatarUrl,
            upi_id: null,
          });

      if (profileError) {
        console.error(
          "Unable to create profile:",
          profileError
        );
      }
    }
  }

  return NextResponse.redirect(
    new URL(
      "/dashboard",
      requestUrl.origin
    )
  );
}