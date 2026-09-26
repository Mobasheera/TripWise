// @ts-expect-error Next.js processes this stylesheet import at build time.
import "./globals.css";

export const metadata = {
  title: "GroupTrip Ledger",
  description: "Plan trips, split expenses and settle payments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}