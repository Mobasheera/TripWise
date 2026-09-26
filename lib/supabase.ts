import { createBrowserClient } from "@supabase/ssr";

export type AuthProfile = {
  id: string;
  email: string;
  name: string;
  avatar: string;
  avatar_url: string;
  upi_id: string | null;
};

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
  return createBrowserClient(getSupabaseUrl(), getSupabaseKey());
}

/**
 * Existing TripWise API.
 *
 * Keep this export because existing pages use getSupabase().
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

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
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
 * Magic-link / email authentication
 * ---------------------------------------------------------------------------
 */

export async function sendMagicLink(email: string) {
  const supabase = getSupabaseBrowser();

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Please enter your email address.");
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    throw error;
  }
}

/**
 * ---------------------------------------------------------------------------
 * Metadata helpers
 * ---------------------------------------------------------------------------
 */

function getMetadataName(metadata: Record<string, unknown>) {
  const fullName =
    typeof metadata.full_name === "string"
      ? metadata.full_name.trim()
      : "";

  const name =
    typeof metadata.name === "string"
      ? metadata.name.trim()
      : "";

  return fullName || name || "TripWise user";
}

function getMetadataAvatar(metadata: Record<string, unknown>) {
  const avatar =
    typeof metadata.avatar_url === "string"
      ? metadata.avatar_url.trim()
      : "";

  const picture =
    typeof metadata.picture === "string"
      ? metadata.picture.trim()
      : "";

  return avatar || picture || "";
}

/**
 * ---------------------------------------------------------------------------
 * Authenticated user
 * ---------------------------------------------------------------------------
 *
 * Returns the Supabase authenticated user together with the TripWise
 * application profile, if one exists.
 */

export async function getAuthenticatedUser(): Promise<{
  user: {
    id: string;
    email: string;
    metadata: Record<string, unknown>;
  };
  profile: AuthProfile | null;
}> {
  const supabase = getSupabaseBrowser();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    const message = authError.message?.toLowerCase() || "";

    if (
      message.includes("auth session missing") ||
      message.includes("session missing") ||
      message.includes("not authenticated")
    ) {
      throw new Error("You need to sign in first.");
    }

    throw authError;
  }

  if (!user) {
    throw new Error("You need to sign in first.");
  }

  const metadata = (user.user_metadata ?? {}) as Record<
    string,
    unknown
  >;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, email, avatar_url, upi_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      metadata,
    },

    profile: profile
      ? {
          id: profile.id,
          email: profile.email ?? user.email ?? "",
          name: profile.name ?? "",
          avatar: profile.avatar_url ?? "",
          avatar_url: profile.avatar_url ?? "",
          upi_id: profile.upi_id ?? null,
        }
      : null,
  };
}

/**
 * ---------------------------------------------------------------------------
 * Current authenticated TripWise user
 * ---------------------------------------------------------------------------
 *
 * Returns null when there is no active session.
 *
 * If a session exists but the profile does not exist yet, the profile is
 * created automatically from the authenticated user's metadata.
 */

export async function getCurrentUser(): Promise<AuthProfile | null> {
  const supabase = getSupabaseBrowser();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    const message = authError.message?.toLowerCase() || "";

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

  const metadata = (user.user_metadata ?? {}) as Record<
    string,
    unknown
  >;

  const name = getMetadataName(metadata);
  const email = user.email ?? "";
  const avatar = getMetadataAvatar(metadata);

  /**
   * Find existing TripWise profile.
   */

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("id, name, email, avatar_url, upi_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  /**
   * First login:
   *
   * Google authentication succeeded but there is no TripWise profile yet.
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
      .select("id, name, email, avatar_url, upi_id")
      .single();

    if (insertError) {
      throw insertError;
    }

    return {
      id: user.id,
      email,
      name,
      avatar: newProfile.avatar_url ?? avatar,
      avatar_url: newProfile.avatar_url ?? avatar,
      upi_id: newProfile.upi_id ?? null,
    };
  }

  /**
   * Existing TripWise profile.
   */

  const finalAvatar = profile.avatar_url || avatar;

  return {
    id: user.id,
    email: profile.email || email,
    name: profile.name || name,
    avatar: finalAvatar,
    avatar_url: finalAvatar,
    upi_id: profile.upi_id ?? null,
  };
}

/**
 * ---------------------------------------------------------------------------
 * Save complete profile
 * ---------------------------------------------------------------------------
 *
 * Supports both:
 *
 * 1. First/last-name onboarding
 * 2. Existing TripWise profile editing
 */

export async function saveProfile(
  data:
    | {
        firstName: string;
        lastName: string;
        avatarUrl?: string | null;
      }
    | {
        name: string;
        email?: string | null;
        avatar_url?: string | null;
        upi_id?: string | null;
      }
) {
  const supabase = getSupabaseBrowser();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    const message = authError.message?.toLowerCase() || "";

    if (
      message.includes("auth session missing") ||
      message.includes("session missing") ||
      message.includes("not authenticated")
    ) {
      throw new Error("You need to sign in first.");
    }

    throw authError;
  }

  if (!user) {
    throw new Error("You need to sign in first.");
  }

  let cleanName: string;
  let cleanEmail = user.email ?? "";
  let cleanAvatar: string | null = null;
  let cleanUpiId: string | null = null;

  /**
   * New onboarding profile page.
   */

  if ("firstName" in data) {
    const cleanFirstName = data.firstName.trim();
    const cleanLastName = data.lastName.trim();

    if (!cleanFirstName || !cleanLastName) {
      throw new Error("Please enter your first and last name.");
    }

    cleanName = `${cleanFirstName} ${cleanLastName}`.trim();

    cleanAvatar = data.avatarUrl?.trim() || null;
  }

  /**
   * Existing TripWise profile page.
   */

  else {
    cleanName = data.name.trim();

    if (!cleanName) {
      throw new Error("Please enter your name.");
    }

    cleanEmail =
      data.email?.trim() ||
      user.email ||
      "";

    cleanAvatar =
      data.avatar_url?.trim() ||
      null;

    cleanUpiId =
      data.upi_id?.trim() ||
      null;
  }

  const metadata = (user.user_metadata ?? {}) as Record<
    string,
    unknown
  >;

  const metadataAvatar = getMetadataAvatar(metadata);

  if (!cleanAvatar) {
    cleanAvatar = metadataAvatar || null;
  }

  const {
    data: updatedProfile,
    error: updateError,
  } = await supabase
    .from("profiles")
    .update({
      name: cleanName,
      email: cleanEmail,
      avatar_url: cleanAvatar,
      upi_id: cleanUpiId,
    })
    .eq("id", user.id)
    .select("id, name, email, avatar_url, upi_id")
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
   * If the profile doesn't exist yet, create it.
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
        upi_id: cleanUpiId,
      })
      .select("id, name, email, avatar_url, upi_id")
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
 * Auth-architecture profile onboarding
 * ---------------------------------------------------------------------------
 */

export async function saveProfileName({
  firstName,
  lastName,
  avatarUrl,
}: {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}) {
  const supabase = getSupabaseBrowser();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("You need to sign in first.");
  }

  const cleanFirstName = firstName.trim();
  const cleanLastName = lastName.trim();

  if (!cleanFirstName || !cleanLastName) {
    throw new Error(
      "Please enter your first and last name."
    );
  }

  const metadata = (user.user_metadata ?? {}) as Record<
    string,
    unknown
  >;

  const metadataAvatar = getMetadataAvatar(metadata);

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        name: `${cleanFirstName} ${cleanLastName}`.trim(),
        email: user.email ?? "",
        avatar_url:
          avatarUrl ||
          metadataAvatar ||
          null,
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
 * Save UPI ID / payment method
 * ---------------------------------------------------------------------------
 *
 * Supports:
 * - a real UPI ID
 * - "cash"
 */

export async function saveUpiId(upiId: string) {
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

  const cleanValue = upiId.trim();

  if (!cleanValue) {
    throw new Error(
      "Please enter a UPI ID or select Cash."
    );
  }

  const metadata = (user.user_metadata ?? {}) as Record<
    string,
    unknown
  >;

  const name = getMetadataName(metadata);
  const email = user.email ?? "";
  const avatar =
    getMetadataAvatar(metadata) || null;

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        name,
        email,
        avatar_url: avatar,
        upi_id: cleanValue,
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
 * Clear UPI ID
 * ---------------------------------------------------------------------------
 */

export async function clearUpiId() {
  const supabase = getSupabaseBrowser();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error(
      "You need to sign in first."
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      upi_id: null,
    })
    .eq("id", user.id);

  if (error) {
    throw error;
  }
}

/**
 * ---------------------------------------------------------------------------
 * Sign out
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