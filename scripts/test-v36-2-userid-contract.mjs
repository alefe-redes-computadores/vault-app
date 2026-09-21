import fs from "node:fs";
const s=fs.readFileSync("components/HealthReminderReconciler.tsx","utf8");
const ok=(v,m)=>{if(!v)throw new Error("V36.2: "+m)};
ok((s.match(/const eventUserId = item\.user_id\?\.trim\(\);/g)||[]).length===3,"user_id não refinado nos 3 eventos");
ok((s.match(/if \(!id \|\| !personId \|\| !eventUserId\) continue;/g)||[]).length===3,"guard incompleto");
ok((s.match(/userId: eventUserId,/g)||[]).length===3,"scheduler não recebe userId refinado");
ok(!s.includes("userId: item.user_id,"),"user_id opcional ainda enviado diretamente");
console.log("V36.2 USER_ID CONTRACT: OK");
