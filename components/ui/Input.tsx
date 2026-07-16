"use client";

import { forwardRef, InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-ink-primary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full rounded-xl bg-surface-raised border border-surface-border
            px-4 py-3 text-ink-primary placeholder:text-ink-muted/50
            focus:outline-none focus:border-steel-light
            transition-colors
            ${error ? "border-coral focus:border-coral" : ""}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-xs text-coral">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";