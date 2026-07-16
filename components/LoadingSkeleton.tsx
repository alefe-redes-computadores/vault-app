"use client";

export function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-card bg-surface-raised border border-surface-border p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-surface-border" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-surface-border rounded w-3/4" />
              <div className="h-3 bg-surface-border rounded w-1/2" />
              <div className="h-3 bg-surface-border rounded w-1/3" />
            </div>
            <div className="w-5 h-5 rounded-full bg-surface-border" />
          </div>
        </div>
      ))}
    </div>
  );
}