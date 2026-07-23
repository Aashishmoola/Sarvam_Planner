export function CompletionBadge({ value }: { value: number | null }) {
  return (
    <div className="text-right">
      <div className="text-xs uppercase tracking-wider text-gray-fade">
        Completion
      </div>
      <div className="text-2xl font-medium text-blue-200">
        {value === null ? "—" : `${value}%`}
      </div>
    </div>
  );
}
