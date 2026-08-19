"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState, useEffect } from "react";
import { CloudOff, RefreshCw, Check } from "lucide-react";
import { db } from "@/lib/db";

function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}

export function SyncStatusIndicator() {
  const online = useOnlineStatus();
  const pendingCount = useLiveQuery(() => db.syncQueue.count(), []) ?? 0;

  if (!online) {
    return (
      <div className="flex items-center gap-1.5 text-amber-400">
        <CloudOff size={14} />
        <span className="text-[11px] font-medium">Offline</span>
        {pendingCount > 0 && (
          <span className="min-w-[18px] rounded-full bg-amber-400/20 px-1 py-0.5 text-center text-[10px] font-bold">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5 text-amber-400">
        <RefreshCw size={14} className="animate-spin" />
        <span className="text-[11px] font-medium">Sync</span>
        <span className="min-w-[18px] rounded-full bg-amber-400/20 px-1 py-0.5 text-center text-[10px] font-bold">
          {pendingCount}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-emerald-400">
      <Check size={14} strokeWidth={3} />
      <span className="text-[11px] font-medium">Sincronizado</span>
    </div>
  );
}