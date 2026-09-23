import fs from "node:fs";
const r=f=>fs.readFileSync(f,"utf8"),ok=(v,m)=>{if(!v)throw Error("V43: "+m)};
const e=r("lib/overdue-dose-notifications.ts"),c=r("components/OverdueDoseNotificationReconciler.tsx"),
a=r("hooks/useDoseNotificationActions.ts"),p=r("components/Providers.tsx");
ok(e.includes("OVERDUE_DELAY_MINUTES = 30"),"atraso");
ok(e.includes("HORIZON_DAYS = 7")&&e.includes("MAX_PENDING_OVERDUE = 40"),"anti-spam");
ok(e.includes('med.tipo_uso !== "sos"')&&e.includes('med.tipo_uso !== "esporadico"'),"SOS");
ok(e.includes('med.status !== "descontinuado"'),"descontinuado");
ok(e.includes("log.tomado_em || log.ignorado_em"),"DoseLog real");
ok(e.includes('isVaultNotificationCategoryEnabled("doses")')&&e.includes("isNotificationPreferenceEnabled()"),"preferências");
ok(e.includes("LocalNotifications.checkPermissions()")&&!e.includes("requestPermissions("),"permissão");
ok(e.includes('type:"dose_overdue"')&&e.includes("MARKER_PREFIX"),"dedup");
ok(c.includes("db.doseLogs")&&c.includes("db.medicamentos"),"reconciliador");
ok(a.includes('extra.type !== "dose_overdue"'),"ações overdue");
ok((a.match(/cancelOverdueDoseNotification\(\{/g)||[]).length>=2,"cancelamento TOMEI/IGNORAR");
ok(p.includes("<OverdueDoseNotificationReconciler />"),"mount");
console.log("V43 OVERDUE DOSE NOTIFICATIONS CONTRACT: OK");
