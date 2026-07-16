"use client";

import { useHapticFeedback } from "@/lib/haptics";
import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  haptic?: "vibrate" | "success" | "error";
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      haptic = "vibrate",
      fullWidth = false,
      className = "",
      onClick,
      ...props
    },
    ref
  ) => {
    const { trigger } = useHapticFeedback();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      trigger(haptic);
      onClick?.(e);
    };

    const variants = {
      primary: "bg-ice text-void hover:bg-ice/90",
      secondary: "bg-surface-raised text-ink-primary border border-surface-border hover:bg-surface-border",
      ghost: "text-ink-primary hover:bg-surface-raised",
      danger: "bg-coral/20 text-coral hover:bg-coral/30",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2.5 text-sm",
      lg: "px-6 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        onClick={handleClick}
        className={`
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? "w-full" : ""}
          rounded-full font-medium transition-all active:scale-[0.98]
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";