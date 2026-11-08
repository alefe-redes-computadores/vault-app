/** M98 — all CSV and JSON bytes are produced locally. No remote upload. */
import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { Report360, Report360Row } from "./clinical-report-360";

const columns = ["categoria","data","horario","titulo","detalhes","origem","id_fonte","gravidade","evidencias"] as const;
const csvCell = (input: unknown): string => {
  let value = String(input ?? "").replace(/\u0000/g, "");
  // RFC 4180 quoting PLUS spreadsheet formula protection, including leading whitespace.
  if (/^[\s\u0001-\u001f\uFEFF]*[=+\-@]/u.test(value)) value = "'" + value;
  return `"${value.replace(/"/g, '""')}"`;
};
function cells(row: Report360Row): unknown[] {
  return [row.category,row.date,row.time||"",row.title,row.detail,row.source,row.sourceId,row.severity||"",row.evidence.join(" | ")];
}
export function clinicalReport360Csv(report: Report360): string {
  const header = columns.join(",");
  const rows = report.rows.map(row => cells(row).map(csvCell).join(","));
  return "\uFEFF" + [header,...rows].join("\r\n") + "\r\n";
}
export function clinicalReport360Json(report: Report360): string {
  return JSON.stringify({format:"vault.clinical_report_360.v1",report},null,2) + "\n";
}
/** A share chooser never proves that any recipient received a file. */
export async function deliverClinicalReport360File(report: Report360, extension:"csv"|"json"): Promise<void> {
  const data = extension === "csv" ? clinicalReport360Csv(report) : clinicalReport360Json(report);
  const filename = `VAULT-relatorio-${report.start}-${report.end}.${extension}`;
  const mime = extension === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8";
  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({path:`vault-export/${filename}`,data, directory:Directory.Cache,encoding:Encoding.UTF8,recursive:true});
    const uri = await Filesystem.getUri({path:`vault-export/${filename}`,directory:Directory.Cache});
    if (!uri.uri) throw new Error("Falha ao preparar o arquivo.");
    await Share.share({title:"VAULT — relatório escolhido",url:uri.uri,dialogTitle:"Salvar ou compartilhar arquivo"});
    return;
  }
  const blob = new Blob([data], {type:mime});
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");a.href=url;a.download=filename;
    a.style.display="none";document.body.append(a);a.click();a.remove();
  } finally {
    // Release on next user turn, not synchronously before the browser starts the download.
    window.setTimeout(()=>URL.revokeObjectURL(url), 30000);
  }
}
