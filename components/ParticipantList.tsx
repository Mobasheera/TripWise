type Props = { children?: React.ReactNode };

export default function ParticipantList({ children }: Props) {
  return <section className="rounded-2xl border border-line bg-[#fffdf7] p-5"><p className="text-sm font-semibold">ParticipantList</p>{children}</section>;
}
