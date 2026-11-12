const META_PREFIX = "[VAULT:PRODUTO]";

export type ManufacturerMetadata = {
  manufacturer?: string;
  commercialName?: string;
};

const KNOWN: Array<{ match: RegExp; label: string; color: string }> = [
  { match: /eurofarma/i, label: "Eurofarma", color: "#F97316" },
  { match: /althaia/i, label: "Althaia", color: "#7C3AED" },
  { match: /medley/i, label: "Medley", color: "#2563EB" },
  { match: /ems\b/i, label: "EMS", color: "#DC2626" },
  { match: /neo\s*quimica/i, label: "Neo Química", color: "#FACC15" },
  { match: /ache/i, label: "Aché", color: "#059669" },
  { match: /germed/i, label: "Germed", color: "#0891B2" },
  { match: /geolab/i, label: "Geolab", color: "#16A34A" },
  { match: /cimed/i, label: "Cimed", color: "#EAB308" },
  { match: /torrent/i, label: "Torrent", color: "#0F766E" },
];

function normalized(value?: string | null) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function manufacturerIdentity(value?: string | null) {
  const raw = normalized(value);
  const known = KNOWN.find(item => item.match.test(raw));
  if (known) return known;
  let hash = 0;
  for (const char of raw.toLocaleLowerCase("pt-BR")) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const fallback = ["#2563EB", "#7C3AED", "#0891B2", "#059669", "#C2410C", "#BE123C"];
  return { label: raw || "Fabricante não informado", color: fallback[hash % fallback.length] };
}

export function attachManufacturerMetadata(notes: string | null | undefined, metadata: ManufacturerMetadata) {
  const visible = stripManufacturerMetadata(notes);
  // Check-ins pertencem ao histórico da aquisição e nunca são apagados
  // quando se edita somente o fabricante.
  const checkIns = String(notes ?? "").split(/\r?\n/).filter(line => line.startsWith("[VAULT:RELATO-FABRICANTE]"));
  const clean = Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, normalized(value)]).filter(([, value]) => value));
  if (!Object.keys(clean).length) return [visible, ...checkIns].filter(Boolean).join("\n") || undefined;
  return [visible, ...checkIns, `${META_PREFIX}${JSON.stringify(clean)}`].filter(Boolean).join("\n");
}

export function readManufacturerMetadata(notes?: string | null): ManufacturerMetadata {
  const line = String(notes ?? "").split(/\r?\n/).find(item => item.startsWith(META_PREFIX));
  if (!line) return {};
  try {
    const parsed = JSON.parse(line.slice(META_PREFIX.length));
    return { manufacturer: normalized(parsed?.manufacturer) || undefined, commercialName: normalized(parsed?.commercialName) || undefined };
  } catch { return {}; }
}

export function stripManufacturerMetadata(notes?: string | null) {
  return String(notes ?? "").split(/\r?\n/).filter(line => !line.startsWith(META_PREFIX) && !line.startsWith("[VAULT:RELATO-FABRICANTE]")).join("\n").trim();
}

/**
 * M128: edição de observações NÃO pode apagar relatos antigos.
 * Apenas as notas humanas e o fabricante declarado no evento são editáveis.
 * Dados históricos de experiências mantêm a identificação de origem.
 */
export function mergeManufacturerAcquisitionEditM128(
  originalNotes: string | null | undefined,
  humanNotes: string,
  manufacturer: string | undefined,
): string | null {
  const historical = String(originalNotes ?? "").split(/\r?\n/)
    .filter(line => line.startsWith("[VAULT:RELATO-FABRICANTE]"));
  const originalMetadata = readManufacturerMetadata(originalNotes);
  const cleanHumanNotes = stripManufacturerMetadata(humanNotes);
  const complete = [cleanHumanNotes, ...historical].filter(Boolean).join("\n");
  const result = attachManufacturerMetadata(complete, {
    ...originalMetadata,
    ...(manufacturer === undefined ? {} : { manufacturer: manufacturer.trim().slice(0, 120) }),
  });
  return result || null;
}

export type ManufacturerExperienceCheckIn = {
  acquisitionId: string;
  manufacturer: string;
  day: 1 | 3 | 7 | 30;
  recordedAt: string;
  focus?: number;
  clarity?: number;
  anxiety?: number;
  appetite?: number;
  sleep?: number;
  perceivedDuration?: string;
  adverseEffects?: string;
  notes?: string;
};

export function describeDeclaredManufacturerPreference(manufacturer: string, checkIns: ManufacturerExperienceCheckIn[]) {
  const own = checkIns.filter(item => item.manufacturer === manufacturer);
  return own.length ? `Experiência com ${manufacturer}: ${own.length} relato(s) registrado(s) por você. O Vault não conclui equivalência ou superioridade clínica.` : null;
}
