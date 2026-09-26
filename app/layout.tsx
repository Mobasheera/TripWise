import "./globals.css";
import type { Metadata } from "next";
import AIAssistant from "@/components/ai/AIAssistant";

export const metadata: Metadata = {
  title: "TripWise — Make the trip memorable, not the math.",
  description:
    "TripWise makes group travel expenses understandable, fair and easy to settle.",
  icons: { icon: "/images/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <AIAssistant />
      </body>
    </html>
  );
}