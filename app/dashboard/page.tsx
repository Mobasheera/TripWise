import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <p className="text-sm text-slate-500">Dashboard</p>
          <h1 className="text-3xl font-bold">My Trips</h1>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/trip/demo"
            className="rounded-2xl border bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold">Goa Trip</h2>
            <p className="mt-2 text-slate-500">4 members · ₹24,500 tracked</p>
          </Link>
          <Link
            href="/trip/new"
            className="rounded-2xl border border-dashed p-6"
          >
            <h2 className="text-xl font-semibold">+ Create new trip</h2>
          </Link>
        </div>
      </div>
    </main>
  );
}
