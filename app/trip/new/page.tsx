export default function NewTripPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-8">
        <h1 className="text-2xl font-bold">Create a trip</h1>
        <div className="mt-6 space-y-4">
          <input className="w-full rounded-lg border p-3" placeholder="Trip name" />
          <input className="w-full rounded-lg border p-3" placeholder="Destination" />
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded-lg border p-3" type="date" />
            <input className="rounded-lg border p-3" type="date" />
          </div>
          <button className="w-full rounded-lg bg-slate-900 p-3 text-white">Create Trip</button>
        </div>
      </div>
    </main>
  );
}
