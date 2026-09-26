import Link from "next/link";

export default async function Page({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  return (
    <main className="min-h-screen bg-paper p-8">
      <div className="mx-auto max-w-5xl">
        <Link href={`/trip/${tripId}`} className="text-sm text-stone-500">← Trip overview</Link>
        <p className="eyebrow mt-10">Bookings</p>
        <h1 className="display mt-3 text-5xl">Bookings workspace</h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-stone-500">
          This route is scaffolded for the TripWise bookings lane and is ready for the team to connect to Supabase data.
        </p>
      </div>
    </main>
  );
}
