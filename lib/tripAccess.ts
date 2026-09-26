import { getCurrentUser, getSupabase } from "@/lib/supabase";

export type AccessibleTrip = {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
  created_at: string;
};

/**
 * Return only trips accessible to the currently signed-in TripWise user.
 *
 * A trip is accessible when the user:
 *  - created the trip, or
 *  - is present in trip_members for that trip.
 *
 * If there is no authenticated user, an empty list is returned.
 */
export async function getAccessibleTrips(): Promise<AccessibleTrip[]> {
  const supabase = getSupabase();
  const currentUser = await getCurrentUser();

  // getCurrentUser() can return null when the user is not authenticated.
  // Do not access currentUser.id until we have verified that the user exists.
  if (!currentUser) {
    return [];
  }

  const userId = currentUser.id;

  const [ownedResult, membershipResult] = await Promise.all([
    supabase
      .from("trips")
      .select(
        "id, name, destination, start_date, end_date, created_by, created_at"
      )
      .eq("created_by", userId),

    supabase
      .from("trip_members")
      .select("trip_id")
      .eq("user_id", userId),
  ]);

  if (ownedResult.error) {
    throw ownedResult.error;
  }

  if (membershipResult.error) {
    throw membershipResult.error;
  }

  const ownedTrips = (ownedResult.data ?? []) as AccessibleTrip[];

  const memberTripIds = Array.from(
    new Set(
      (membershipResult.data ?? [])
        .map((row: { trip_id: string | null }) => row.trip_id)
        .filter((tripId): tripId is string => Boolean(tripId))
    )
  );

  let memberTrips: AccessibleTrip[] = [];

  if (memberTripIds.length > 0) {
    const memberResult = await supabase
      .from("trips")
      .select(
        "id, name, destination, start_date, end_date, created_by, created_at"
      )
      .in("id", memberTripIds);

    if (memberResult.error) {
      throw memberResult.error;
    }

    memberTrips = (memberResult.data ?? []) as AccessibleTrip[];
  }

  /*
   * Combine:
   *   1. Trips created by the user
   *   2. Trips where the user is a member
   *
   * Map removes duplicates when the user is both the creator
   * and a trip member.
   */
  return Array.from(
    new Map(
      [...ownedTrips, ...memberTrips].map((trip) => [trip.id, trip])
    ).values()
  ).sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  );
}