import type { HealthDevice } from "./types";

export type AvatarSide = "left" | "right";
export type AvatarWearable = {
  kind: "watch" | "ring";
  side: AvatarSide;
  device: HealthDevice;
  count: number;
};

export function avatarColor(value: string, fallback = "#bb8159"): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
}

export function avatarShade(value: string, factor: number): string {
  const color = avatarColor(value);
  return "#" + [1, 3, 5].map((offset) =>
    Math.max(0, Math.min(255, Math.round(parseInt(color.slice(offset, offset + 2), 16) * factor)))
      .toString(16).padStart(2, "0")
  ).join("");
}

/** One drawing per physical slot; registered duplicates remain described. */
export function avatarLayout(devices: HealthDevice[]) {
  const worn = devices.filter((device) => device.active && device.side !== "none" &&
    (device.kind === "watch" || device.kind === "ring"));
  const slots: AvatarWearable[] = [];
  for (const side of ["right", "left"] as const) {
    for (const kind of ["watch", "ring"] as const) {
      const matches = worn.filter((device) => device.side === side && device.kind === kind)
        .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || "") || a.id.localeCompare(b.id));
      if (matches.length) slots.push({ side, kind, device: matches[0], count: matches.length });
    }
  }
  const right = slots.filter((slot) => slot.side === "right").length;
  const left = slots.filter((slot) => slot.side === "left").length;
  const phoneSide: AvatarSide = right <= left ? "right" : "left";
  const description = worn.length
    ? worn.map((device) => `${device.name}, lado ${device.side === "right" ? "direito" : "esquerdo"}`).join("; ")
    : "Nenhum relógio ou anel com lado de uso informado.";
  return { slots, phoneSide, description };
}

export function avatarVisualSignature(skin:string,devices:HealthDevice[]) {
 const layout=avatarLayout(devices);
 return JSON.stringify([avatarColor(skin),layout.phoneSide,layout.slots.map(slot=>[slot.kind,slot.side,slot.device.id,slot.device.name,avatarColor(slot.device.color,'#94a3b8')])]);
}

export function avatarTapEligible(type:string,moved:boolean,start:{x:number;y:number},end:{x:number;y:number}) {
 return type==='pointerup'&&!moved&&Math.hypot(end.x-start.x,end.y-start.y)<=6;
}
