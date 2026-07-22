"use client";

import { useHapticFeedback } from "@/lib/haptics";
import { forwardRef, ButtonHTMLAttributes, ReactNode, memo } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  haptic?: "vibrate" | "success" | "error" | "heavy" | "light";
  fullWidth?: boolean;
  loading?: boolean;
}

function ButtonComponent(
  {
    children,
    variant = "primary",
    size = "md",
    haptic = "vibrate",
    fullWidth = false,
    loading = false,
    className = "",
    onClick,
    disabled,
    ...props
  }: ButtonProps,
  ref: React.ForwardedRef<HTMLButtonElement>
) {
  const { trigger } = useHapticFeedback();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return;
    trigger(haptic);
    onClick?.(e);
  };

  const variants = {
    primary: "bg-ice text-void hover:bg-ice/90 active:scale-95",
    secondary: "bg-surface-raised text-ink-primary border border-surface-border hover:bg-surface-border active:scale-95",
    ghost: "text-ink-primary hover:bg-surface-raised active:scale-95",
    danger: "bg-coral/20 text-coral hover:bg-coral/30 active:scale-95",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const loadingStates = {
    primary: "bg-ice/70 text-void/70",
    secondary: "bg-surface-raised/70 text-ink-primary/70",
    ghost: "text-ink-primary/50",
    danger: "bg-coral/10 text-coral/50",
  };

  return (
    <button
      ref={ref}
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]}
        ${loading ? loadingStates[variant] : ""}
        ${sizes[size]}
        ${fullWidth ? "w-full" : ""}
        rounded-xl font-medium transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-ice/40 focus:ring-offset-2 focus:ring-offset-void
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Carregando...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export const Button = memo(forwardRef(ButtonComponent));
Button.displayName = "Button";