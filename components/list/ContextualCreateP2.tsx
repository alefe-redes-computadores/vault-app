"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { getIa20CreateAccent, type ComposeOption } from "@/lib/navigation/bottom-nav-compose";
import { withReturnTarget } from "@/lib/navigation/return-context";
import { ia20P2Route } from "@/lib/navigation/ia20-p2-create";

/** Single explicit creation CTA; never a second data-writing authority. */
export function ContextualCreateP2({
  option, pathname, searchParams,
}: {
  option: ComposeOption;
  pathname: string;
  searchParams: Pick<URLSearchParams,"toString">;
}) {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const [navigating, setNavigating] = useState(false);
  // A stalled client navigation must never strand the create CTA disabled.
  // This only resets navigation feedback; it does not confirm any clinical write.
  useEffect(() => {
    if (!navigating) return;
    const recovery = window.setTimeout(() => setNavigating(false), 8000);
    return () => window.clearTimeout(recovery);
  }, [navigating]);
  const Icon = option.icon;
  const query = searchParams.toString();
  const origin = `${ia20P2Route(pathname)}${query ? `?${query}` : ""}`;
  const target = withReturnTarget(option.path, origin);

  return <button
    type="button"
    aria-label={option.label}
    title={option.label}
    aria-busy={navigating}
    disabled={navigating}
    data-ia20-p2-create={option.id}
    onClick={() => {
      if (navigating) return;
      setNavigating(true);
      trigger("vibrate");
      try { router.push(target); }
      catch { setNavigating(false); }
    }}
    className={`inline-flex min-h-11 min-w-0 max-w-full shrink-0 items-center justify-center gap-2 rounded-2xl border px-3.5 py-2 text-[12px] font-semibold shadow-sm transition-transform active:scale-[.98] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60 ${getIa20CreateAccent(option.id)}`}
  >
    {navigating ? <LoaderCircle size={17} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true"/> : <Icon size={18} strokeWidth={2.2} className="shrink-0" aria-hidden="true"/>}
    <span className="max-w-[min(52vw,150px)] break-words text-center leading-tight">{option.label}</span>
  </button>;
}
