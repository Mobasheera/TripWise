import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GroupTrip Ledger",
  description: "Plan trips, split expenses, and settle fairly."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
