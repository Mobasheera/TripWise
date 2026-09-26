type Props = { children?: React.ReactNode };

export default function ItemAssignment({ children }: Props) {
  return <section className="rounded-2xl border border-line bg-[#fffdf7] p-5"><p className="text-sm font-semibold">ItemAssignment</p>{children}</section>;
}
