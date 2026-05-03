export function MatchChips({ chips }: { chips: string[] }) {
  if (chips.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <li
          key={c}
          className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 ring-1 ring-blue-200"
        >
          {c}
        </li>
      ))}
    </ul>
  );
}
