import { type EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function redirectToLogin(requestUrl: URL, error: string) {
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(error)}`, requestUrl.origin)
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const rawType = requestUrl.searchParams.get("type");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase environment variables are missing.");
    return redirectToLogin(requestUrl, "supabase_config");
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items) {
        items.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  let authError: Error | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
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

    if (!emailOtpTypes.includes(rawType as EmailOtpType)) {
      return redirectToLogin(requestUrl, "magic_link");
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: rawType as EmailOtpType,
    });

    authError = error;
  } else {
    return redirectToLogin(requestUrl, "oauth");
  }

  if (authError) {
    console.error("Supabase authentication callback error:", authError);
    return redirectToLogin(
      requestUrl,
      code ? "oauth" : "magic_link"
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Supabase user lookup error:", userError);
    return redirectToLogin(requestUrl, "oauth");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Supabase profile lookup error:", profileError);
    return redirectToLogin(requestUrl, "profile");
  }

  const destination = profile
    ? "/dashboard"
    : "/onboarding/profile";

  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}
