import { type EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function redirectToLogin(
  requestUrl: URL,
  error: string,
) {
  return NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent(error)}`,
      requestUrl.origin,
    ),
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code =
    requestUrl.searchParams.get("code");

  const tokenHash =
    requestUrl.searchParams.get("token_hash");

  const rawType =
    requestUrl.searchParams.get("type");

  /**
   * Supabase configuration
   */

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "Supabase environment variables are missing.",
    );

    return redirectToLogin(
      requestUrl,
      "supabase_config",
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
                  options,
                );
              },
            );
          } catch (error) {
            console.error(
              "Could not set Supabase auth cookies:",
              error,
            );
          }
        },
      },
    },
  );

  /**
   * -------------------------------------------------------------------------
   * Exchange OAuth code OR verify magic-link token
   * -------------------------------------------------------------------------
   */

  let authError: Error | null = null;

  if (code) {
    const { error } =
      await supabase.auth.exchangeCodeForSession(
        code,
      );

    authError = error;
  } else if (tokenHash && rawType) {
    const emailOtpTypes: EmailOtpType[] = [
      "signup",
      "email",
      "magiclink",
      "recovery",
      "invite",
      "email_change",
    ];

    if (
      !emailOtpTypes.includes(
        rawType as EmailOtpType,
      )
    ) {
      return redirectToLogin(
        requestUrl,
        "magic_link",
      );
    }

    const { error } =
      await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: rawType as EmailOtpType,
      });

    authError = error;
  } else {
    return redirectToLogin(
      requestUrl,
      "oauth",
    );
  }

  if (authError) {
    console.error(
      "Supabase authentication callback error:",
      authError,
    );

    return redirectToLogin(
      requestUrl,
      code ? "oauth" : "magic_link",
    );
  }

  /**
   * -------------------------------------------------------------------------
   * Get authenticated user
   * -------------------------------------------------------------------------
   */

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      "Supabase user lookup error:",
      userError,
    );

    return redirectToLogin(
      requestUrl,
      "oauth",
    );
  }

  /**
   * -------------------------------------------------------------------------
   * Find TripWise profile
   * -------------------------------------------------------------------------
   */

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Supabase profile lookup error:",
      profileError,
    );

    return redirectToLogin(
      requestUrl,
      "profile",
    );
  }

  /**
   * -------------------------------------------------------------------------
   * Create profile automatically when it doesn't exist
   * -------------------------------------------------------------------------
   *
   * This is particularly useful for Google sign-in.
   */

  if (!profile) {
    const metadata =
      (user.user_metadata ?? {}) as Record<
        string,
        unknown
      >;

    const name =
      typeof metadata.full_name === "string"
        ? metadata.full_name.trim()
        : typeof metadata.name === "string"
          ? metadata.name.trim()
          : user.email?.split("@")[0] ||
            "Traveler";

    const avatarUrl =
      typeof metadata.avatar_url === "string"
        ? metadata.avatar_url.trim()
        : typeof metadata.picture === "string"
          ? metadata.picture.trim()
          : null;

    const { error: insertError } =
      await supabase
        .from("profiles")
        .insert({
          id: user.id,
          name,
          email: user.email || null,
          avatar_url: avatarUrl,
          upi_id: null,
        });

    if (insertError) {
      /**
       * A profile creation failure should not silently redirect
       * to the dashboard because the dashboard may expect the profile.
       */

      console.error(
        "Unable to create TripWise profile:",
        insertError,
      );

      return redirectToLogin(
        requestUrl,
        "profile",
      );
    }
  }

  /**
   * -------------------------------------------------------------------------
   * Destination
   * -------------------------------------------------------------------------
   *
   * If the profile already existed, go to dashboard.
   *
   * If it was just created, the user can still proceed to dashboard because
   * the basic profile has already been populated from auth metadata.
   */

  return NextResponse.redirect(
    new URL(
      "/dashboard",
      requestUrl.origin,
    ),
  );
}