import { BillScanner } from "@/components/BillScanner";
import { BalanceSummary } from "@/components/BalanceSummary";
import { ExpenseCard } from "@/components/ExpenseCard";
import { ParticipantList } from "@/components/ParticipantList";

export default async function TripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <p className="text-sm text-slate-500">Trip / {tripId}</p>
          <h1 className="text-4xl font-bold">Goa Trip</h1>
          <p className="mt-2 text-slate-500">12 Jun – 16 Jun · INR</p>
        </header>
        <BalanceSummary />
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold">Expenses</h2>
            <ExpenseCard title="Hotel" amount={8000} payer="Rahul" />
            <ExpenseCard title="Dinner" amount={2500} payer="Amit" />
            <ExpenseCard title="Taxi" amount={1200} payer="Sahil" />
          </section>
          <aside className="space-y-6">
            <ParticipantList />
            <BillScanner />
          </aside>
        </div>
      </div>
    </main>
  );
}
