type Props = {
  children?: React.ReactNode;
};

export default function Sidebar({ children }: Props) {
  return (
    <aside className="w-full rounded-2xl border border-line bg-[#fffdf7] p-5 lg:w-64">
      <p className="text-sm font-semibold text-ink">
        Trip navigation
      </p>

      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </aside>
  );
}