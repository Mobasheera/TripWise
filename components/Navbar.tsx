import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="display text-xl font-semibold"
        >
          TripWise
        </Link>

        <Link
          href="/dashboard"
          className="text-sm text-stone-500 transition hover:text-ink"
        >
          Dashboard
        </Link>
      </div>
    </header>
  );
}