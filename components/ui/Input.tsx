"use client";

import { forwardRef, InputHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, containerClassName = "", className = "", ...props }, ref) => {
    return (
      <div className={`space-y-1.5 ${containerClassName}`}>
        {label && (
          <label className="block text-sm font-medium text-ink-primary">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`
              w-full rounded-xl bg-surface-raised border border-surface-border/50 
              px-4 py-3 text-ink-primary placeholder:text-ink-muted/50
              focus:outline-none focus:border-ice/50 focus:ring-2 focus:ring-ice/20
              transition-all duration-150
              ${icon ? "pl-10" : ""}
              ${error ? "border-coral/50 focus:border-coral/50 focus:ring-coral/20" : ""}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-coral"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";