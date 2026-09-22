import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GroupTrip Ledger",
  description: "Explainable group-trip expense settlement"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
