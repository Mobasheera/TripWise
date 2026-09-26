"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDollarSign,
  MapPin,
  Receipt,
  Sparkles,
  Users,
  Wallet,
  
}from "lucide-react";

const people = [
  { name: "A", color: "bg-[#d8c9a7]" },
  { name: "R", color: "bg-[#b9c7b1]" },
  { name: "M", color: "bg-[#c9b8ad]" },
  { name: "S", color: "bg-[#aebfc7]" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f1e7] text-[#181916]">
      {/* Background grid */}
      <div className="pointer-events-none fixed inset-0 -z-0 opacity-40">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(24,25,22,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(24,25,22,.055) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
      </div>

      {/* NAVBAR */}
      <header className="relative z-20 border-b border-[#1b1c18]/10 bg-[#f5f1e7]/90 backdrop-blur-md">
        <div className="mx-auto flex h-[78px] max-w-[1280px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#191a18] text-sm font-bold text-white">
              T
            </span>

            <span className="font-serif text-[25px] font-bold tracking-[-0.04em]">
              TripWise
            </span>
          </Link>

          <nav className="hidden items-center gap-9 text-sm font-medium text-[#535149] md:flex">
            <a
              href="#how-it-works"
              className="transition hover:text-[#191a18]"
            >
              How it works
            </a>

            <a
              href="#features"
              className="transition hover:text-[#191a18]"
            >
              Features
            </a>

            <a href="#faq" className="transition hover:text-[#191a18]">
              FAQ
            </a>
          </nav>

          {/* IMPORTANT:
              Get Started goes to LOGIN.
              Login page decides whether user should go to dashboard.
          */}
          <Link
            href="/login"
            className="group flex items-center gap-2 rounded-full bg-[#191a18] px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#292a26]"
          >
            Get started
            <ArrowUpRight
              size={15}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10">
        <div className="mx-auto grid min-h-[calc(100vh-78px)] max-w-[1280px] items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-10 lg:py-16">
          {/* LEFT */}
          <div className="relative max-w-[650px]">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#75643e]/20 bg-[#eee5d2] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#806a37]">
              <Sparkles size={13} />
              Group travel, simplified
            </div>

            <h1 className="font-serif text-[clamp(3.7rem,7vw,6.8rem)] leading-[0.84] tracking-[-0.065em]">
              Every trip.
              <br />
              <span className="text-[#7c786f]">One clear</span>
              <br />
              ledger.
            </h1>

            <p className="mt-8 max-w-[560px] text-[17px] leading-8 text-[#625f57] sm:text-[18px]">
              Plan together, track every expense, split bills fairly, and
              settle up without the spreadsheet chaos.
            </p>

            {/* CTA */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#191a18] px-7 py-4 text-sm font-bold text-white shadow-[0_12px_30px_rgba(25,26,24,.12)] transition hover:-translate-y-1"
              >
                Start a trip
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>

              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#292a25]/15 bg-[#f9f6ee] px-7 py-4 text-sm font-bold text-[#292a25] transition hover:bg-white"
              >
                See how it works
              </a>
            </div>

            {/* Proof */}
            <div className="mt-10 flex flex-wrap items-center gap-5 text-xs text-[#777269]">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#dfe8d9] text-[#496044]">
                  <Check size={13} />
                </span>
                Shared expenses
              </div>

              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8dfd0] text-[#715f3e]">
                  <Check size={13} />
                </span>
                Smart settlement
              </div>

              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#dce6e9] text-[#4d6871]">
                  <Check size={13} />
                </span>
                One trip ledger
              </div>
            </div>
          </div>

          {/* RIGHT VISUAL */}
          <div className="relative mx-auto w-full max-w-[620px] lg:ml-auto">
            <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full border border-[#7f765f]/15 bg-[#e9e1cf]/40 blur-[1px]" />

            <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full border border-[#7f765f]/15 bg-[#dce3d7]/40" />

            {/* Main dashboard card */}
            <div className="relative rotate-[1deg] rounded-[34px] border border-[#292a25]/15 bg-[#fbf8f0] p-3 shadow-[0_35px_90px_rgba(44,40,29,.13)]">
              <div className="rounded-[27px] border border-[#292a25]/10 bg-[#f6f2e8] p-5 sm:p-7">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a7951]">
                      Current trip
                    </p>

                    <h2 className="mt-2 font-serif text-3xl tracking-[-0.04em] sm:text-4xl">
                      Goa getaway
                    </h2>

                    <div className="mt-2 flex items-center gap-1.5 text-xs text-[#777269]">
                      <MapPin size={13} />
                      Goa, India · 4 days
                    </div>
                  </div>

                  <div className="rounded-full border border-[#292a25]/15 bg-white px-3 py-1.5 text-xs font-bold">
                    4 people
                  </div>
                </div>

                {/* Balance */}
                <div className="mt-7 rounded-[24px] bg-[#1b1c19] p-5 text-white sm:p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/55">
                      Your trip balance
                    </span>

                    <CircleDollarSign
                      size={19}
                      className="text-white/45"
                    />
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-4">
                    <div>
                      <div className="font-serif text-4xl tracking-[-0.05em] sm:text-5xl">
                        ₹1,240
                      </div>

                      <p className="mt-1 text-xs text-white/55">
                        you owe the group
                      </p>
                    </div>

                    <div className="rounded-full bg-[#dce8d4] px-3 py-1.5 text-[11px] font-bold text-[#42543d]">
                      3 expenses pending
                    </div>
                  </div>
                </div>

                {/* Expense */}
                <div className="mt-4 rounded-[23px] border border-[#292a25]/10 bg-white p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eee5d2]">
                        <Receipt size={19} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">
                          Dinner at Casa Luna
                        </p>

                        <p className="mt-1 text-xs text-[#8a857c]">
                          Receipt scanned · 7 items
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-sm font-bold">
                      ₹1,680
                    </div>
                  </div>

                  <div className="mt-4 border-t border-dashed border-[#292a25]/15 pt-3 text-xs text-[#78746c]">
                    Your share · paneer tikka + ⅓ shared pizza + tax
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[20px] border border-[#292a25]/10 bg-white p-4">
                    <p className="text-[11px] text-[#8a857c]">You paid</p>
                    <p className="mt-1 font-serif text-2xl">₹2,100</p>
                  </div>

                  <div className="rounded-[20px] border border-[#292a25]/10 bg-white p-4">
                    <p className="text-[11px] text-[#8a857c]">
                      Group spent
                    </p>
                    <p className="mt-1 font-serif text-2xl">₹6,840</p>
                  </div>
                </div>

                {/* Members */}
                <div className="mt-5 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {people.map((person, index) => (
                      <div
                        key={index}
                        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#f6f2e8] ${person.color} text-xs font-bold`}
                      >
                        {person.name}
                      </div>
                    ))}
                  </div>

                  <span className="text-xs text-[#777269]">
                    All expenses synced
                  </span>
                </div>
              </div>
            </div>

            {/* Settlement floating card */}
            <div className="absolute -bottom-7 -left-5 w-[205px] rotate-[-4deg] rounded-[22px] border border-[#292a25]/10 bg-white p-4 shadow-[0_18px_45px_rgba(44,40,29,.12)] sm:-left-10">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dce8d4]">
                  <Wallet size={15} />
                </div>

                <span className="text-xs font-bold">Settlement</span>
              </div>

              <p className="mt-3 text-[11px] text-[#858078]">
                Payments simplified
              </p>

              <div className="mt-1 flex items-center justify-between">
                <span className="font-serif text-xl">₹0 pending</span>
                <Check size={16} className="text-[#50644a]" />
              </div>
            </div>

            {/* People floating card */}
            <div className="absolute -right-4 -top-8 w-[180px] rotate-[4deg] rounded-[20px] border border-[#292a25]/10 bg-[#eee7d9] p-4 shadow-[0_18px_40px_rgba(44,40,29,.09)] sm:-right-8">
              <div className="flex items-center gap-2">
                <Users size={15} />
                <span className="text-xs font-bold">Trip crew</span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {people.slice(0, 3).map((person, index) => (
                    <div
                      key={index}
                      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#eee7d9] ${person.color} text-[9px] font-bold`}
                    >
                      {person.name}
                    </div>
                  ))}
                </div>

                <span className="text-[11px] text-[#777269]">+1</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="relative z-10 border-t border-[#292a25]/10 bg-[#ece7da]/70"
      >
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-10">
          <div className="max-w-[650px]">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#806a37]">
              How TripWise works
            </p>

            <h2 className="mt-4 font-serif text-4xl leading-tight tracking-[-0.045em] sm:text-5xl">
              From “who paid?”
              <br />
              to “all settled.”
            </h2>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <FeatureStep
              number="01"
              icon={<Users size={19} />}
              title="Create the trip"
              text="Add your friends, dates, destination, bookings and shared plans."
            />

            <FeatureStep
              number="02"
              icon={<Receipt size={19} />}
              title="Track everything"
              text="Record expenses and split them equally, by item, percentage or exact amount."
            />

            <FeatureStep
              number="03"
              icon={<Wallet size={19} />}
              title="Settle up"
              text="TripWise calculates who owes whom and keeps every payment in one place."
            />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative z-10 bg-[#f5f1e7]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#806a37]">
                Built for group trips
              </p>

              <h2 className="mt-4 font-serif text-4xl tracking-[-0.045em] sm:text-5xl">
                Less chasing.
                <br />
                More travelling.
              </h2>
            </div>

            <p className="max-w-xl text-[16px] leading-7 text-[#69655c]">
              Everything your group needs to keep the trip organized without
              turning one person into the unofficial accountant.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MiniFeature
              icon={<Receipt size={18} />}
              title="Smart expenses"
              text="Keep every shared cost attached to the trip."
            />

            <MiniFeature
              icon={<CircleDollarSign size={18} />}
              title="Fair splits"
              text="Split by person, item, percentage or exact amount."
            />

            <MiniFeature
              icon={<Sparkles size={18} />}
              title="AI assistance"
              text="Turn receipts into structured expenses faster."
            />

            <MiniFeature
              icon={<Wallet size={18} />}
              title="Simple settlement"
              text="See exactly who needs to pay whom."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-[#292a25]/10 bg-[#191a18] text-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 text-center sm:px-8 lg:px-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#c6b98e]">
            Your next trip starts here
          </p>

          <h2 className="mx-auto mt-5 max-w-3xl font-serif text-5xl leading-[0.95] tracking-[-0.055em] sm:text-7xl">
            Make memories.
            <br />
            Leave the math to TripWise.
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-white/55">
            One shared space for planning, expenses, receipts, balances and
            settlement.
          </p>

          <Link
            href="/login"
            className="mt-9 inline-flex items-center gap-3 rounded-full bg-[#f4eee0] px-7 py-4 text-sm font-bold text-[#191a18] transition hover:-translate-y-1"
          >
            Start your trip
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 bg-[#f5f1e7]">
        <div className="mx-auto max-w-[900px] px-5 py-20 sm:px-8">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#806a37]">
            FAQ
          </p>

          <h2 className="mt-4 text-center font-serif text-4xl tracking-[-0.04em]">
            Questions, answered.
          </h2>

          <div className="mt-10 divide-y divide-[#292a25]/10 border-y border-[#292a25]/10">
            <Faq
              question="Can everyone in the trip add expenses?"
              answer="Yes. TripWise is designed around shared trip activity, so group members can contribute expenses and keep the ledger together."
            />

            <Faq
              question="Can different expenses have different splits?"
              answer="Yes. Expenses can be split using different methods depending on what the group decides."
            />

            <Faq
              question="Does TripWise calculate who owes whom?"
              answer="Yes. The settlement view uses the trip expenses and completed payments to calculate the current balances."
            />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-[#292a25]/10 bg-[#f5f1e7]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-7 text-xs text-[#777269] sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#191a18] text-[10px] font-bold text-white">
              T
            </span>

            <span className="font-bold text-[#292a25]">TripWise</span>
          </div>

          <p>Group travel, without the awkward math.</p>
        </div>
      </footer>

            {/* Mobile floating button */}
      <Link
        href="/login"
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#191a18] text-white shadow-xl md:hidden"
      >
        <ArrowUpRight size={19} />
      </Link>

      {/* TripWise AI */}
      {/* <AIAssistant /> */}
    </main>
  );
}

function FeatureStep({
  number,
  icon,
  title,
  text,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[26px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 transition hover:-translate-y-1 hover:bg-white">
      <div className="flex items-center justify-between">
        <span className="font-serif text-3xl text-[#aaa397]">{number}</span>

        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e6dfd0]">
          {icon}
        </span>
      </div>

      <h3 className="mt-9 font-serif text-2xl tracking-[-0.03em]">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-[#777269]">{text}</p>
    </div>
  );
}

function MiniFeature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#292a25]/10 bg-[#faf7ef] p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8e1d3]">
        {icon}
      </span>

      <h3 className="mt-6 font-serif text-xl">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-[#777269]">{text}</p>
    </div>
  );
}

function Faq({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="group py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-left font-medium">
        <span>{question}</span>

        <ChevronDown
          size={18}
          className="shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#777269]">
        {answer}
      </p>
    </details>
  );
}
