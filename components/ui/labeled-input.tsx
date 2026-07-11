import { forwardRef, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export const LabeledInput = forwardRef<HTMLInputElement, Props>(
  function LabeledInput({ label, hint, error, className = "", ...props }, ref) {
    return (
      <label className="block">
        <span className="text-xs uppercase tracking-wider text-gray-fade">
          {label}
        </span>
        <input
          ref={ref}
          className={`mt-1 block w-full rounded-none border-b border-gray-soft bg-transparent px-0 py-2 text-blue-50 outline-none transition-colors focus:border-blue-400 disabled:opacity-40 ${className}`}
          {...props}
        />
        {hint && !error && (
          <span className="mt-1 block text-[11px] text-gray-mid">{hint}</span>
        )}
        {error && (
          <span className="mt-1 block text-[11px] text-blue-300">{error}</span>
        )}
      </label>
    );
  },
);
