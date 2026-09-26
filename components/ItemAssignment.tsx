type Props = {
  children?: React.ReactNode;
};

export default function ItemAssignment({ children }: Props) {
  return (
    <section className="rounded-2xl border border-line bg-[#fffdf7] p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e5dac2] text-pine">
          ✓
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            Assign Items
          </p>

          <p className="mt-1 text-sm leading-6 text-stone-500">
            Map each receipt item to the participants who consumed it.
          </p>

          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </section>
  );
}