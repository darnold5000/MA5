"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <path d="M2 2l20 20" />
    </svg>
  );
}

type PasswordFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  labelClassName?: string;
  inputClassName?: string;
};

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  required,
  labelClassName,
  inputClassName,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="block space-y-1.5 text-sm sm:space-y-2" htmlFor={inputId}>
      <span
        className={cn(
          "font-semibold tracking-wide uppercase",
          labelClassName,
        )}
      >
        {label}
      </span>
      <div className="relative isolate">
        <input
          id={inputId}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          className={cn(
            "relative z-0 min-h-10 w-full border border-border bg-background px-3 pr-11 text-foreground outline-none sm:min-h-11",
            inputClassName,
          )}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 z-10 flex w-11 items-center justify-center border-l border-border bg-background text-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
        >
          {show ? (
            <EyeOffIcon className="h-5 w-5 shrink-0 stroke-[2]" />
          ) : (
            <EyeIcon className="h-5 w-5 shrink-0 stroke-[2]" />
          )}
        </button>
      </div>
    </label>
  );
}
