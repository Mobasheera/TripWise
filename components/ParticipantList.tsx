type Participant =
  | string
  | {
      id?: string;
      name: string;
    };

type Props = {
  children?: React.ReactNode;
  participants?: Participant[];
};

export default function ParticipantList({
  children,
  participants = [],
}: Props) {
  return (
    <section className="rounded-2xl border border-line bg-[#fffdf7] p-5">
      <p className="text-sm font-semibold text-ink">
        Participants
      </p>

      {participants.length > 0 && (
        <ul className="mt-4 space-y-2">
          {participants.map((participant, index) => {
            const name =
              typeof participant === "string"
                ? participant
                : participant.name;

            const key =
              typeof participant === "string"
                ? `${participant}-${index}`
                : participant.id ?? `${name}-${index}`;

            return (
              <li
                key={key}
                className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink"
              >
                {name}
              </li>
            );
          })}
        </ul>
      )}

      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}