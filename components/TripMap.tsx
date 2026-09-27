"use client";

import dynamic from "next/dynamic";

const TripMapClient = dynamic(
  () => import("./TripMapClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-[28px] border border-[#292a25]/10 bg-[#ebe8dc]">
        <span className="text-sm text-[#6c7168]">
          Loading trip map...
        </span>
      </div>
    ),
  }
);

type TripMapProps = {
  destination?: string | null;
  locations?: string[];
};

export default function TripMap(props: TripMapProps) {
  return <TripMapClient {...props} />;
}