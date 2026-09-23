import fs from "node:fs";
const s=fs.readFileSync("components/BiometricLock.tsx","utf8");
for(const n of [
 "VAULT_BIOMETRIC_LIFECYCLE_V41",
 "backgroundedAtRef",
 "REAL_BACKGROUND_THRESHOLD_MS",
 'App.addListener("appStateChange"',
 "backgroundedAtRef",
 "REAL_BACKGROUND_THRESHOLD_MS",
 "awayForMs < REAL_BACKGROUND_THRESHOLD_MS",
 "!isAuthenticated && (",
 'className="fixed inset-0 z-[100]'
]) if(!s.includes(n)) throw new Error(`V41 ausente: ${n}`);
if(s.includes('if (isAuthenticated) return <>{children}</>;'))
 throw new Error("V41: lock ainda desmonta children");
const a=s.indexOf('App.addListener("appStateChange"');
const b=s.indexOf("const backgroundedAt",a);
const inactive=s.slice(a,b);
if(inactive.includes("setIsAuthenticated(false)"))
 throw new Error("V41: inactive ainda bloqueia imediatamente");
console.log("V41 BIOMETRIC LIFECYCLE CONTRACT: OK");
