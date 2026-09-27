import { createBrowserClient } from "@supabase/ssr";

/**
 * ---------------------------------------------------------------------------
 * Supabase configuration
 * ---------------------------------------------------------------------------
 */

function getSupabaseKey() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local."
    );
  }

  return key;
}

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL to .env.local."
    );
  }

  return url;
}

/**
 * ---------------------------------------------------------------------------
 * Browser Supabase client
 * ---------------------------------------------------------------------------
 */

export function getSupabaseBrowser() {
  return createBrowserClient(
    getSupabaseUrl(),
    getSupabaseKey()
  );
}

/**
 * ---------------------------------------------------------------------------
 * Existing TripWise API
 *
 * Keep this export because your existing pages use getSupabase().
 * ---------------------------------------------------------------------------
 */

export function getSupabase() {
  return getSupabaseBrowser();
}

/**
 * ---------------------------------------------------------------------------
 * Google authentication
 * ---------------------------------------------------------------------------
 */

export async function signInWithGoogle() {
  const supabase = getSupabaseBrowser();

  const { error } =
    await supabase.auth.signInWithOAuth({
      provider: "google",

      options: {
        redirectTo:
          `${window.location.origin}/auth/callback`,

        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

  if (error) {
    throw error;
  }
}

/**
 * ---------------------------------------------------------------------------
 * Current authenticated user
 *
 * Existing functionality preserved.
 *
 * This:
 * 1. Gets the authenticated Supabase user.
 * 2. Creates a profile if one doesn't exist.
 * 3. Returns profile information.
 * ---------------------------------------------------------------------------
 */

export async function getCurrentUser() {
  const supabase = getSupabaseBrowser();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  /**
   * No active session.
   */

  if (authError) {
    const message =
      authError.message?.toLowerCase() || "";

    if (
      message.includes("auth session missing") ||
      message.includes("session missing") ||
      message.includes("not authenticated")
    ) {
      return null;
    }

    throw authError;
  }

  if (!user) {
    return null;
  }

  const metadata = user.user_metadata ?? {};

  const name =
    metadata.full_name ??
    metadata.name ??
    "TripWise user";

  const email = user.email ?? "";

  const avatar =
    metadata.avatar_url ??
    metadata.picture ??
    "";

  /**
   * Find existing TripWise profile.
   */

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "id, name, email, avatar_url, upi_id"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  /**
   * First login:
   *
   * Google authentication succeeded but there is
   * no TripWise profile yet.
   */

  if (!profile) {
    const {
      data: newProfile,
      error: insertError,
    } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        name,
        email,
        avatar_url: avatar || null,
        upi_id: null,
      })
      .select(
        "id, name, email, avatar_url, upi_id"
      )
      .single();

    if (insertError) {
      throw insertError;
    }

    return {
      id: user.id,
      email,
      name,
      avatar:
        newProfile.avatar_url ?? avatar,
      avatar_url:
        newProfile.avatar_url ?? avatar,
      upi_id:
        newProfile.upi_id ?? null,
    };
  }

  /**
   * Existing TripWise profile.
   */

  return {
    id: user.id,
    email: profile.email || email,
    name: profile.name || name,
    avatar:
      profile.avatar_url || avatar,
    avatar_url:
      profile.avatar_url || avatar,
    upi_id:
      profile.upi_id ?? null,
  };
}

/**
 * ---------------------------------------------------------------------------
 * Save complete profile
 *
 * ADDED FUNCTIONALITY
 *
 * This allows the Profile page to save:
 * - name
 * - email
 * - avatar_url
 * - UPI ID
 *
 * If a profile does not exist, it creates one.
 * ---------------------------------------------------------------------------
 */

export async function saveProfile(data: {
  name: string;
  email?: string | null;
  avatar_url?: string | null;
  upi_id: string;
}) {
  const supabase = getSupabaseBrowser();

  /**
   * Verify authenticated user.
   */

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    const message =
      authError.message?.toLowerCase() || "";

    if (
      message.includes("auth session missing") ||
      message.includes("session missing") ||
      message.includes("not authenticated")
    ) {
      throw new Error(
        "You need to sign in first."
      );
    }

    throw authError;
  }

  if (!user) {
    throw new Error(
      "You need to sign in first."
    );
  }

  /**
   * Clean values before saving.
   */

  const cleanName = data.name.trim();
  const cleanUpiId = data.upi_id.trim();

  const cleanEmail =
    data.email?.trim() ||
    user.email ||
    null;

  const cleanAvatar =
    data.avatar_url?.trim() ||
    null;

  if (!cleanName) {
    throw new Error(
      "Please enter your name."
    );
  }

  /**
   * Update existing profile.
   */

  const {
    data: updatedProfile,
    error: updateError,
  } = await supabase
    .from("profiles")
    .update({
      name: cleanName,
      email: cleanEmail,
      avatar_url: cleanAvatar,
      upi_id: cleanUpiId || null,
    })
    .eq("id", user.id)
    .select(
      "id, name, email, avatar_url, upi_id"
    )
    .maybeSingle();

  if (updateError) {
    console.error(
      "Profile update failed:",
      updateError
    );

    throw new Error(
      updateError.message ||
        "Unable to save your profile."
    );
  }

  /**
   * If no profile exists, create it.
   *
   * This is useful for a user whose Google login
   * succeeded but whose profile row was never created.
   */

  if (!updatedProfile) {
    const {
      data: insertedProfile,
      error: insertError,
    } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        name: cleanName,
        email: cleanEmail,
        avatar_url: cleanAvatar,
        upi_id: cleanUpiId || null,
      })
      .select(
        "id, name, email, avatar_url, upi_id"
      )
      .single();

    if (insertError) {
      console.error(
        "Profile insert failed:",
        insertError
      );

      throw new Error(
        insertError.message ||
          "Unable to create your profile."
      );
    }

    return insertedProfile;
  }

  return updatedProfile;
}

/**
 * ---------------------------------------------------------------------------
 * Save UPI ID
 *
 * Existing functionality preserved.
 *
 * This now uses upsert so it also works if the profile
 * row does not exist yet.
 * ---------------------------------------------------------------------------
 */

export async function saveUpiId(
  upiId: string
) {
  const supabase = getSupabaseBrowser();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    const message =
      authError.message?.toLowerCase() || "";

    if (
      message.includes("auth session missing") ||
      message.includes("session missing") ||
      message.includes("not authenticated")
    ) {
      throw new Error(
        "You need to sign in first."
      );
    }

    throw authError;
  }

  if (!user) {
    throw new Error(
      "You need to sign in first."
    );
  }

  const cleanUpiId = upiId.trim();

  if (!cleanUpiId) {
    throw new Error(
      "Please enter a UPI ID."
    );
  }

  const metadata = user.user_metadata ?? {};

  const name =
    metadata.full_name ??
    metadata.name ??
    "TripWise user";

  const email = user.email ?? "";

  const avatar =
    metadata.avatar_url ??
    metadata.picture ??
    null;

  const { error } =
    await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          name,
          email,
          avatar_url: avatar,
          upi_id: cleanUpiId,
        },
        {
          onConflict: "id",
        }
      );

  if (error) {
    throw error;
  }
}

/**
 * ---------------------------------------------------------------------------
 * Sign out
 *
 * Existing functionality preserved.
 * ---------------------------------------------------------------------------
 */

export async function signOut() {
  const supabase = getSupabaseBrowser();

  const { error } =
    await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}