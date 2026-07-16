"use client";

import { forwardRef, TextareaHTMLAttributes } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-ink-primary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full rounded-xl bg-surface-raised border border-surface-border
            px-4 py-3 text-ink-primary placeholder:text-ink-muted/50
            focus:outline-none focus:border-steel-light
            transition-colors resize-none
            ${error ? "border-coral focus:border-coral" : ""}
            ${className}
          `}
          rows={3}
          {...props}
        />
        {error && (
          <p className="text-xs text-coral">{error}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";