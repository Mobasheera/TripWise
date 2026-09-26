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
 * Return only trips that belong to the currently signed-in TripWise user.
 *
 * A trip is accessible when the user:
 *  - created the trip, or
 *  - is present in trip_members for that trip.
 *
 * This intentionally avoids selecting every row from `trips`, which caused
 * other users' trips to appear in the TripWise sidebar and summary selector.
 */
export async function getAccessibleTrips(): Promise<AccessibleTrip[]> {
  const supabase = getSupabase();
  const currentUser = await getCurrentUser();

  const [ownedResult, membershipResult] = await Promise.all([
    supabase
      .from("trips")
      .select(
        "id, name, destination, start_date, end_date, created_by, created_at"
      )
      .eq("created_by", currentUser.id),
    supabase
      .from("trip_members")
      .select("trip_id")
      .eq("user_id", currentUser.id),
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
        .filter(Boolean)
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
