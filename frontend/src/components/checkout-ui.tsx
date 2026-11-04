import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/format";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base text-ink outline-none transition placeholder:text-muted/50 focus:border-accent focus:ring-2 focus:ring-accent/15 aria-invalid:border-red-300 aria-invalid:ring-2 aria-invalid:ring-red-100 sm:text-sm",
        className,
      )}
    />
  );
}

export function Field({
  label,
  htmlFor,
  children,
  hint,
  error,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
  error?: string | null;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-ink">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1.5 text-[11px] leading-4 text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[11px] leading-4 text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
