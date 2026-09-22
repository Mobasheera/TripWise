import { SettlementTable } from "@/components/SettlementTable";
import { AIExplanation } from "@/components/AIExplanation";
import { PaymentButton } from "@/components/PaymentButton";

export default function SettlementPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-3xl font-bold">Settlement</h1>
        <SettlementTable />
        <AIExplanation />
        <PaymentButton amount={2000} receiver="Rahul" />
      </div>
    </main>
  );
}
