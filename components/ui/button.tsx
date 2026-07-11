import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary:
    "border border-blue-400 text-blue-100 hover:bg-blue-400 hover:text-ink-0",
  ghost:
    "border border-gray-soft text-gray-fade hover:border-blue-400 hover:text-blue-100",
  danger:
    "border border-blue-300/50 text-blue-200 hover:bg-blue-300/10",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ variant = "primary", className = "", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={`tap-target inline-flex items-center justify-center px-5 py-2.5 text-sm tracking-wide transition-colors disabled:opacity-40 ${styles[variant]} ${className}`}
      {...props}
    />
  );
});
