"use client";

import { forwardRef, TextareaHTMLAttributes, useId } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className = "", ...props }, ref) => {
    const generatedId = useId();
    const inputId = props.id || generatedId;
    const errorId = `${inputId}-error`;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-ink-primary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? [props["aria-describedby"], errorId].filter(Boolean).join(" ") : props["aria-describedby"]}
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
          <p id={errorId} role="alert" className="text-xs text-coral">{error}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";