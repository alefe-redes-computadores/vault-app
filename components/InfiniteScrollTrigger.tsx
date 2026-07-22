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
      <div ref={observerRef} className="flex justify-center py-4">
        <Loader2 size={24} className="animate-spin text-ice" />
      </div>
    </>
  );
}