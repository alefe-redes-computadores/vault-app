// components/loading/DetailSkeleton.tsx
"use client";

export function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-24 rounded-[32px] border border-surface-border/50 bg-surface" />
      <div className="h-40 rounded-[32px] border border-surface-border/50 bg-surface" />
      <div className="h-16 rounded-[24px] border border-surface-border/50 bg-surface" />
    </div>
  );
}