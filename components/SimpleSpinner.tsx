// components/loading/SimpleSpinner.tsx
"use client";

import { Loader2 } from "lucide-react";

export function SimpleSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 size={28} className="animate-spin text-ice" />
    </div>
  );
}