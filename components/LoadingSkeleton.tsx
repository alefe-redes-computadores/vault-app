"use client";

export function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-void px-5 pb-28 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-surface-raised/80 animate-pulse" />
          <div>
            <div className="h-5 w-32 rounded bg-surface-raised/80 animate-pulse" />
            <div className="mt-1 h-3 w-20 rounded bg-surface-raised/60 animate-pulse" />
          </div>
        </div>
        <div className="h-10 w-10 rounded-full bg-surface-raised/80 animate-pulse" />
      </div>

      <div className="mb-6">
        <div className="mb-2 flex justify-between">
          <div className="h-3 w-16 rounded bg-surface-raised/70 animate-pulse" />
          <div className="h-3 w-16 rounded bg-surface-raised/70 animate-pulse" />
        </div>

        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 w-14 rounded-full bg-surface-raised/80 animate-pulse"
            />
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-surface-raised/70 animate-pulse" />
          <div className="h-4 w-20 rounded bg-surface-raised/70 animate-pulse" />
        </div>

        {[1, 2].map((i) => (
          <div
            key={i}
            className="mb-3 rounded-[22px] bg-surface-raised/80 p-4 animate-pulse"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-surface-border/70" />
              <div className="flex-1">
                <div className="h-4 w-36 rounded bg-surface-border/70" />
                <div className="mt-2 h-3 w-24 rounded bg-surface-border/60" />
                <div className="mt-3 h-3 w-40 rounded bg-surface-border/50" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {[1, 2, 3].map((category) => (
        <div key={category} className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-surface-raised/80 animate-pulse" />
            <div className="h-4 w-24 rounded bg-surface-raised/70 animate-pulse" />
          </div>

          {[1, 2, 3].map((card) => (
            <div
              key={card}
              className="mb-3 rounded-[22px] bg-surface-raised/80 p-4 animate-pulse"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-surface-border/70" />
                <div className="flex-1">
                  <div className="h-4 w-40 rounded bg-surface-border/70" />
                  <div className="mt-2 h-3 w-28 rounded bg-surface-border/60" />
                  <div className="mt-3 h-3 w-48 rounded bg-surface-border/50" />
                  <div className="mt-2 h-3 w-32 rounded bg-surface-border/50" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="fixed bottom-24 left-1/2 flex -translate-x-1/2 items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full bg-ice/60 animate-pulse" />
        <div className="h-2.5 w-2.5 rounded-full bg-ice/40 animate-pulse [animation-delay:120ms]" />
        <div className="h-2.5 w-2.5 rounded-full bg-ice/20 animate-pulse [animation-delay:240ms]" />
      </div>
    </div>
  );
}