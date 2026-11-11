/* M123: synthetic behavior, owner/person isolation and source invariants. No real health storage. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
let passed=0;
function test(label,run){try{run();passed++;console.log(`M123 OK ${passed}: ${label}`);}catch(e){console.error('M123 FALHA: '+label);throw e;}}
function load(file,mocks={}){
 const src=read(file),js=ts.transpileModule(src,{fileName:file,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});
 assert.equal((js.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,`transpilar ${file}`);
 const mod=new Module(file,module);mod.filename=file;mod.paths=module.paths;
 mod.require=id=>Object.prototype.hasOwnProperty.call(mocks,id)?mocks[id]:require(id);
 mod._compile(js.outputText,file);return mod.exports;
}
const notif=load('lib/health-reminders/notification-lab-m123.ts');
const makeRule=(changes={})=>({id:'r1',user_id:'u1',person_id:'p1',title:'Hidratar',body:'Lembrete personalizado',time:'12:00',status:'active',target_type:'health_record:agua',target_route:'/saude/hidratacao',frequency:'daily',weekdays:[],created_at:'2026-11-10',updated_at:'2026-11-10',synced:true,...changes});
const t=new Date('2026-11-12T15:00:00Z');
const n=(changes={})=>notif.projectNotificationLabM123({rule:makeRule(),userId:'u1',personId:'p1',next:t,quietAtNext:false,master:true,category:true,permission:'granted',...changes});

(async()=>{
 test('prévia usa texto/horário do registro, não inventa entrega',()=>{let v=n();assert.equal(v.status,'eligible');assert.equal(v.title,'Hidratar');assert.equal(v.body,'Lembrete personalizado');assert.equal(v.nextTime,t.toISOString());assert.match(v.note,/não comprova/);});
 test('corpo ausente usa texto canônico do scheduler',()=>assert.equal(n({rule:makeRule({body:undefined})}).body,'Hora de registrar no Vault.'));
 test('check-in privado não mostra título nem corpo personalizáveis',()=>{const v=n({rule:makeRule({target_type:'health_record:humor',title:'SEGREDO',body:'INFORMAÇÃO PRIVADA'})});assert.equal(v.title,'Lembrete do Vault');assert.ok(!JSON.stringify(v).includes('SEGREDO'));assert.ok(!JSON.stringify(v).includes('INFORMAÇÃO PRIVADA'));});
 test('check-in privado usa canal Android protegido',()=>{const v=n({rule:makeRule({target_type:'health_record:humor'})});assert.equal(v.visibility,'private');assert.equal(v.channel,'vault-health-checkin-private-m115');});
 test('outros lembretes mantêm canal normal sem alegar sigilo',()=>{let v=n();assert.equal(v.visibility,'public');assert.equal(v.channel,'vault-health-reminders');});
 test('identidade ausente bloqueia prévia',()=>{let v=n({userId:''});assert.equal(v.status,'missing_scope');assert.equal(v.title,'Prévia indisponível');});
 test('troca de conta não revela dado',()=>{let v=n({userId:'u2',rule:makeRule({title:'SEGREDO'})});assert.equal(v.status,'missing_scope');assert.ok(!JSON.stringify(v).includes('SEGREDO'));});
 test('troca de pessoa não revela dado',()=>{let v=n({personId:'p2',rule:makeRule({body:'SEGREDO'})});assert.equal(v.status,'missing_scope');assert.ok(!JSON.stringify(v).includes('SEGREDO'));});
 test('master off preserva status',()=>assert.equal(n({master:false}).status,'master_off'));
 test('categoria off preserva status',()=>assert.equal(n({category:false}).status,'category_off'));
 test('permissão ausente preserva status',()=>assert.equal(n({permission:'denied'}).status,'permission'));
 test('pausado não aparenta agendamento',()=>assert.equal(n({rule:makeRule({status:'paused'})}).status,'paused'));
 test('silêncio não aparenta alarme',()=>assert.equal(n({quietAtNext:true}).status,'quiet'));
 test('sem próxima ocorrência não simula agendamento',()=>assert.equal(n({next:null}).status,'none'));
 test('data inválida descartada',()=>assert.equal(n({next:new Date('invalid')}).nextTime,null));
 test('rota externa bloqueada sem ocultar o lembrete',()=>{const v=n({rule:makeRule({target_route:'//evil.example'})});assert.equal(v.route,null);assert.equal(v.title,'Hidratar');});
 test('rota com controle de linha bloqueada',()=>assert.equal(n({rule:makeRule({target_route:'/saude\nmal'})}).route,null));
 test('nenhum acesso a browser, banco ou rede no modelo puro',()=>assert.doesNotMatch(read('lib/health-reminders/notification-lab-m123.ts'),/\bfetch\(|localStorage|indexedDB|\bdb\.|\.put\(|setItem\(/));
 test('laboratório reaproveita ocorrência e silêncio canônicos',()=>{const c=read('components/notifications/NotificationLabM123.tsx');assert.ok(c.includes('nextHealthReminderOccurrence(selection)')&&c.includes('quietAtM115(next,quiet)'));});
 test('laboratório filtra por conta/pessoa',()=>{const c=read('components/notifications/NotificationLabM123.tsx');assert.ok(c.includes('rule.user_id === userId && rule.person_id === personId'));});
 test('laboratório não agenda nem solicita permissão',()=>{const c=read('components/notifications/NotificationLabM123.tsx');assert.doesNotMatch(c,/LocalNotifications\.schedule|requestPermissions\(|fetch\(|\.put\(/);});
 test('app possui painel M123 sem perder quiet hours',()=>{const c=read('app/saude/lembretes/page.tsx');assert.ok(c.includes('<NotificationLabM123 reminders={reminders}')&&c.includes('<QuietHoursSettingsM115'));});
 test('canais representados equivalem aos usados pelo scheduler',()=>{const s=read('lib/health-reminders/scheduler.ts');assert.ok(s.includes('PRIVATE_CHECKIN_CHANNEL_ID="vault-health-checkin-private-m115"')&&s.includes('CHANNEL_ID = "vault-health-reminders"'));});
 test('notificações de humor ocultam conteúdo no scheduler',()=>{const s=read('lib/health-reminders/scheduler.ts');assert.ok(s.includes('privateCheckIn?"Lembrete do Vault":rule.title')&&s.includes('visibility: -1'));});
 test('recuperação M123 reutiliza a criptografia M114',()=>{const c=read('lib/private-recovery-m115.ts');assert.ok(c.includes('inspectEncryptedM123')&&c.includes('openPrivateJsonM114<unknown>(namespace(kind),user,person,backup.envelope,passphrase)'));});
 test('recuperação M123 utiliza mesmo validador M115',()=>{const c=read('lib/private-recovery-m115.ts');assert.ok(c.includes('if(!validPlain(kind,value))throw Error('));});
 test('recuperação M123 não substitui importação existente',()=>{const c=read('lib/private-recovery-m115.ts');assert.ok(c.includes('if(localStorage.getItem(destination)!==null||localStorage.getItem(plaintextKey(kind,user,person))!==null)'));});
 test('UI do backup exige ação para limpar clipboard',()=>{const c=read('components/saude/EncryptedRecoveryM115.tsx');assert.ok(c.includes('void clearClipboard()')&&c.includes('if(current.value!==copiedBackup.current)'));});
 test('prévia privada expira quando app oculta',()=>{const c=read('components/saude/EncryptedRecoveryM115.tsx');assert.ok(c.includes('document.visibilityState!=="visible"')&&c.includes('setInspection(null)'));});
 test('backup continua importável exclusivamente com confirmação',()=>{const c=read('components/saude/EncryptedRecoveryM115.tsx');assert.ok(c.includes('window.confirm(')&&c.includes('importEncryptedM115('));});
 // Actual dry-run engine executed with mocked envelope opening, without writing to LocalStorage.
 const stored=new Map();let writes=0;
 const store={getItem:k=>stored.get(k)??null,setItem:(k,v)=>{writes++;stored.set(k,v);},removeItem:k=>{writes++;stored.delete(k);}};
 global.window={localStorage:store};global.localStorage=store;
 const mocks={'@/lib/private-local-vault-m114':{
   isPrivateEnvelopeM114:v=>Boolean(v&&typeof v==='object'&&v.kind==='fixture'&&v.owner&&v.person),
   openPrivateJsonM114:async(namespace,user,person,envelope,passphrase)=>{
     if(user!==envelope.owner||person!==envelope.person||passphrase!=='strong-passphrase-for-test')throw Error('wrong scope or phrase');
     return envelope.content;
   }
 }};
 const recovery=load('lib/private-recovery-m115.ts',mocks);
 const journal=[{id:'abc1',createdAt:'2026-11-10T13:30:00Z',text:'EXEMPLO PRIVADO'}];
 const backup=(kind,content,owner='u1',person='p1')=>JSON.stringify({format:'vault-private-backup-m115',version:1,kind,envelope:{kind:'fixture',owner,person,content}});
 const j=backup('journal',journal),plan={warningSigns:'a',copingSteps:'b',reasonsToStay:'',trustedPeople:'',professionalContacts:'',saferEnvironment:'',trustedContacts:[]},p=backup('safety-plan',plan);
 let before=writes;
 const a=await recovery.inspectEncryptedM123('journal','u1','p1',j,'strong-passphrase-for-test');
 test('ensaio real abre journal sem escrever',()=>{assert.equal(a.validated,true);assert.equal(a.count,1);assert.equal(writes,before);assert.ok(!JSON.stringify(a).includes('EXEMPLO PRIVADO'));});
 const b=await recovery.inspectEncryptedM123('safety-plan','u1','p1',p,'strong-passphrase-for-test');
 test('ensaio de plano só conta seções, sem mostrar conteúdo',()=>{assert.equal(b.count,2);assert.equal(b.kind,'safety-plan');assert.equal(writes,before);});
 await assert.rejects(()=>recovery.inspectEncryptedM123('journal','u1','p1',j,'wrong'));test('frase errada não altera armazenamento',()=>assert.equal(writes,before));
 await assert.rejects(()=>recovery.inspectEncryptedM123('journal','u1','p2',j,'strong-passphrase-for-test'));test('pessoa errada não altera armazenamento',()=>assert.equal(writes,before));
 await assert.rejects(()=>recovery.inspectEncryptedM123('journal','u2','p1',j,'strong-passphrase-for-test'));test('conta errada não altera armazenamento',()=>assert.equal(writes,before));
 await assert.rejects(()=>recovery.inspectEncryptedM123('journal','u1','p1',p,'strong-passphrase-for-test'));test('tipo de cofre incorreto rejeitado',()=>assert.equal(writes,before));
 await assert.rejects(()=>recovery.inspectEncryptedM123('journal','u1','p1',backup('journal',[{id:'X',createdAt:'2026-11-10',text:''}]),'strong-passphrase-for-test'));test('conteúdo inválido rejeitado',()=>assert.equal(writes,before));
 await assert.rejects(()=>recovery.inspectEncryptedM123('journal','u1','p1','{broken','strong-passphrase-for-test'));test('JSON inválido rejeitado',()=>assert.equal(writes,before));
 const saved=stored.get('fixture-local');await recovery.inspectEncryptedM123('journal','u1','p1',j,'strong-passphrase-for-test');test('ensaio não precisa de cofre vazio, não substitui dados',()=>assert.equal(stored.get('fixture-local'),saved));
 test('new TS/TSX sources parse cleanly',()=>{for(const file of ['lib/health-reminders/notification-lab-m123.ts','components/notifications/NotificationLabM123.tsx','lib/private-recovery-m115.ts','components/saude/EncryptedRecoveryM115.tsx','app/saude/lembretes/page.tsx']){const c=read(file);const ast=ts.createSourceFile(file,c,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);assert.equal(ast.parseDiagnostics.length,0,file);}});
 test('canonical gate remains and registers M123',()=>{const gate=read('scripts/test-v63-release-gate.mjs');for(const n of ['m118','m119','m120','m121','m122','m123'])assert.ok(gate.includes(`scripts/test-vault-${n}-`),n);});
 console.log(`VAULT M123: ${passed} garantias sintéticas/integração aprovadas. Sem dados reais.`);
})().catch(error=>{console.error(error);process.exit(1);});
