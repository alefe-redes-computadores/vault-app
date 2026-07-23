"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface InfiniteScrollTriggerProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  children?: React.ReactNode;
}

export function InfiniteScrollTrigger({
  onLoadMore,
  hasMore,
  isLoading,
  children,
}: InfiniteScrollTriggerProps) {
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.5 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  if (!hasMore) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <div
        ref={observerRef}
        className="flex justify-center py-6"
      >
        <div className="flex items-center gap-2 rounded-full border border-surface-border/50 bg-surface-raised px-3 py-2 text-xs text-ink-muted">
          <Loader2 size={16} className="animate-spin text-ice" />
          Carregando mais
        </div>
      </div>
    </>
  );
}