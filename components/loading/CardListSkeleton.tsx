// components/loading/CardListSkeleton.tsx
"use client";

export function CardListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-[24px] border border-surface-border/50 bg-surface p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-surface-raised" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-surface-raised" />
              <div className="h-3 w-24 rounded bg-surface-raised/70" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}