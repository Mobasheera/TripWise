"use client";

import { useState } from "react";

type Props = {
  children?: React.ReactNode;
  onSubmit?: (data: {
    title: string;
    amount: number;
  }) => void | Promise<void>;
};

export default function ExpenseForm({
  children,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!title.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return;
    }

    if (!onSubmit) {
      return;
    }

    try {
      setSaving(true);

      await onSubmit({
        title: title.trim(),
        amount: numericAmount,
      });

      setTitle("");
      setAmount("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-[#fffdf7] p-5">
      <p className="text-sm font-semibold text-ink">
        Add Expense
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-4 space-y-3"
      >
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Expense title"
          className="w-full rounded-xl border border-stone-300 bg-white p-3 text-sm outline-none focus:border-ink"
        />

        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Amount"
          type="number"
          min="0"
          step="0.01"
          className="w-full rounded-xl border border-stone-300 bg-white p-3 text-sm outline-none focus:border-ink"
        />

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save expense"}
        </button>
      </form>

      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}