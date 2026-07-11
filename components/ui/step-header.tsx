type Props = {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
};

export function StepHeader({ step, total, title, subtitle }: Props) {
  return (
    <header className="mb-10">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-gray-fade">
        <span>
          Step {step} of {total}
        </span>
        <div className="flex flex-1 gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-[2px] flex-1 ${
                i < step ? "bg-blue-400" : "bg-gray-soft"
              }`}
            />
          ))}
        </div>
      </div>
      <h1 className="mt-6 text-2xl font-medium tracking-tight text-blue-50">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm text-gray-fade">{subtitle}</p>
      )}
    </header>
  );
}
