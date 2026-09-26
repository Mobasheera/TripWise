"use client";

type Props = {
  children?: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
};

const splitOptions = [
  {
    value: "equal",
    label: "Equal",
  },
  {
    value: "participant",
    label: "Participant Based",
  },
  {
    value: "room",
    label: "Shared Room",
  },
  {
    value: "activity",
    label: "Activity Based",
  },
  {
    value: "organizer",
    label: "Organizer Paid",
  },
];

export default function SplitSelector({
  children,
  value = "equal",
  onChange,
}: Props) {
  return (
    <section className="rounded-2xl border border-line bg-[#fffdf7] p-5">
      <p className="text-sm font-semibold text-ink">
        Split Method
      </p>

      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="mt-3 w-full rounded-xl border border-stone-300 bg-white p-3 text-sm outline-none focus:border-ink"
      >
        {splitOptions.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}