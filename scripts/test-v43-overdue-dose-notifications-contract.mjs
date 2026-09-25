import fs from "node:fs";
const r=f=>fs.readFileSync(f,"utf8"),ok=(v,m)=>{if(!v)throw Error("V43: "+m)};
const e=r("lib/overdue-dose-notifications.ts"),c=r("components/OverdueDoseNotificationReconciler.tsx"),
a=r("hooks/useDoseNotificationActions.ts"),p=r("components/Providers.tsx");
ok(e.includes("VAULT_SMART_OVERDUE_ESCALATION_V52")&&e.includes("getVaultNotificationBrainSettings")&&e.includes("doseOverdueOffsets"),"atraso/escalonamento");
ok(e.includes("HORIZON_DAYS = 7")&&e.includes("MAX_PENDING_OVERDUE = 80"),"anti-spam V52");
ok(/med\.tipo_uso\s*!==\s*"sos"/.test(e)&&/med\.tipo_uso\s*!==\s*"esporadico"/.test(e),"SOS");
ok(/med\.status\s*!==\s*"descontinuado"/.test(e),"descontinuado");
ok(/log\.tomado_em\s*\|\|\s*log\.ignorado_em/.test(e),"DoseLog real");
ok(e.includes('isVaultNotificationCategoryEnabled("doses")')&&e.includes("isNotificationPreferenceEnabled()"),"preferências");
ok(e.includes("LocalNotifications.checkPermissions()")&&!e.includes("requestPermissions("),"permissão");
ok(e.includes('type:"dose_overdue"')&&e.includes("getOverdueDoseNotificationId")&&e.includes("desired.has(n.id)"),"dedup");
ok(c.includes("db.doseLogs")&&c.includes("db.medicamentos"),"reconciliador");
ok(a.includes('extra.type !== "dose_overdue"'),"ações overdue");
ok((a.match(/cancelOverdueDoseNotification\(\{/g)||[]).length>=2,"cancelamento TOMEI/IGNORAR");
ok(p.includes("<OverdueDoseNotificationReconciler />"),"mount");
console.log("V43 OVERDUE DOSE NOTIFICATIONS CONTRACT: OK");
