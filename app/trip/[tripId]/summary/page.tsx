import SpendingSummary from "@/components/SpendingSummary";

type SummaryPageProps = {
  params: Promise<{
    tripId: string;
  }>;
};

export default async function TripSummaryPage({
  params,
}: SummaryPageProps) {
  const { tripId } = await params;

  return <SpendingSummary initialTripId={tripId} />;
}
