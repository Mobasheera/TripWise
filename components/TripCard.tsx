type Props = {
  children?: React.ReactNode;
  name?: string;
  members?: number;
};

export default function TripCard({
  children,
  name,
  members,
}: Props) {
  return (
    <section className="rounded-2xl border border-line bg-[#fffdf7] p-5">
      {name ? (
        <div>
          <b className="text-ink">{name}</b>

          {members !== undefined && (
            <p className="mt-1 text-sm text-stone-500">
              {members}{" "}
              {members === 1 ? "member" : "members"}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm font-semibold text-ink">
          Trip
        </p>
      )}

      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}