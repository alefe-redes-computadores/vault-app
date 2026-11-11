import { Factory } from "lucide-react";
import { manufacturerIdentity } from "@/lib/medications/manufacturer-experience";

export function ManufacturerBadge({ manufacturer, className = "" }: { manufacturer?: string | null; className?: string }) {
  if (!manufacturer?.trim()) return null;
  const identity = manufacturerIdentity(manufacturer);
  return <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`} style={{ color: identity.color, borderColor: `${identity.color}66`, backgroundColor: `${identity.color}18` }} aria-label={`Fabricante ${identity.label}`}><Factory size={12} aria-hidden="true"/>{identity.label}</span>;
}
