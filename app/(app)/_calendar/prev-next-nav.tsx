import Link from "next/link";

export function PrevNextNav({
  prevDate,
  nextDate,
  date,
}: {
  prevDate: string;
  nextDate: string | null;
  date: string;
}) {
  return (
    <nav className="flex items-center gap-3" aria-label="Day navigation">
      <Link
        href={`/day/${prevDate}`}
        aria-label="Previous day"
        className="tap-target inline-flex items-center justify-center border border-gray-soft px-3 text-sm text-blue-50 transition-colors hover:border-blue-400 hover:text-blue-100"
      >
        ←
      </Link>
      <span className="text-sm text-blue-50">{date}</span>
      {nextDate ? (
        <Link
          href={`/day/${nextDate}`}
          aria-label="Next day"
          className="tap-target inline-flex items-center justify-center border border-gray-soft px-3 text-sm text-blue-50 transition-colors hover:border-blue-400 hover:text-blue-100"
        >
          →
        </Link>
      ) : (
        <span
          aria-disabled
          className="tap-target inline-flex items-center justify-center border border-gray-soft px-3 text-sm text-gray-mid opacity-40"
        >
          →
        </span>
      )}
    </nav>
  );
}
