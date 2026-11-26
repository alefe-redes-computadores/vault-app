import fs from "node:fs";
const stock=fs.readFileSync("lib/health-intelligence/clinical-stock.ts","utf8");
const notif=fs.readFileSync("components/MedicamentosNotifications.tsx","utf8");
const care=fs.readFileSync("lib/health-intelligence/medication-care-opportunities.ts","utf8");
const dose=fs.readFileSync("lib/repositories/doseLogs.ts","utf8");
const ren=fs.readFileSync("lib/repositories/renovacoes.ts","utf8");
const ok=(v,m)=>{if(!v)throw Error("V47: "+m)};
for(const x of ['"unknown"','"empty"','"available"','"negative"']) ok(stock.includes(x),"estado ausente "+x);
ok(stock.includes("registeredQuantity === null"),"unknown não explícito");
ok(notif.includes("getClinicalStockSnapshot"),"notificações ainda usam saldo bruto");
ok(!notif.includes("med.estoque_quantidade <= 3"),"limite bruto <=3 permaneceu");
ok(care.includes("stockSnapshot.state"),"care opportunities sem estado clínico");
// The historical quantity is represented by the immutable applied receipt; a new
// conversion cannot reconstruct or override the previous amount.
const {loadMacro02Pure}= (await import('./vault-macro02-test-pure-loader.cjs')).default;
const {planStockChange}=loadMacro02Pure('@/lib/dose-premium/stock-evidence');
const identity={user_id:'u',person_id:'p',medicationId:'m',doseId:'d'};
const before={user_id:'u',person_id:'p',medicationId:'m',unit:'ml',basis:'cycle1',balance:9.5};
const previous={state:'applied',receipt:{...identity,basis:'cycle1',unit:'ml',amount:.5,appliedAt:'2026-11-25T08:00:00Z'}};
const args={identity,stock:before,previous,wasTaken:true,willBeTaken:false,quantity:10,unit:{unidade_dose:'drop',fonte_unidade:'declared'},conversion:{kind:'drops_per_ml',factor:40,source:'declared',medicationId:'m',basis:'cycle1'},adjustStock:true,asOf:'2026-11-25T10:00:00Z'};
const reversal=planStockChange(args);
ok(reversal.kind==='ready'&&reversal.delta===-.5&&before.balance-reversal.delta===10,"undo usa o movimento histórico, não a conversão atual");
ok(dose.includes('prepareClinicalWrite(')&&dose.includes('confirmObservedWrite(')&&dose.includes('commitPremiumDose('),"repository preserva autoridade canônica de estoque");
ok(planStockChange({...args,stock:{...before,basis:'cycle2'}}).kind==='blocked'&&planStockChange({...args,previous:null}).kind==='blocked',"restauração sem prova ou em outro ciclo bloqueada");
ok(planStockChange({...args,previous:{...previous,receipt:{...previous.receipt,person_id:'foreign'}}}).kind==='blocked',"recibo de outra pessoa não autoriza restituição");
ok(ren.includes("Estoque só é alterado por uma aquisição real."),"Receita != Aquisição regrediu");
ok(ren.includes("!somenteReceita"),"receita isolada pode alterar estoque");
console.log("V47 CLINICAL STOCK CONTRACT: OK");
