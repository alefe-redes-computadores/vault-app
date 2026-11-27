'use strict';
// Exact static export of the certified source, genuine Chromium and IndexedDB.
// Auth and REST are a synthetic transport boundary, not a real Supabase deployment.
// Every clinical RPC below executes actual PostgreSQL under authenticated, never postgres.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),{execFileSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE),root=path.resolve('out'),origin='http://127.0.0.1:4173',uid='00000000-0000-4000-8000-000000000001',pid='00000000-0000-4000-8000-000000000002',ep='00000000-0000-4000-8000-000000000003',mid='00000000-0000-4000-8000-000000000104',mid2='00000000-0000-4000-8000-000000000204';
const cid=process.env.LAB_PG_CID;assert.match(cid,/^[0-9a-f]{64}$/);const uuid=v=>{assert.match(v,/^[0-9a-f-]{36}$/);return `'${v}'::uuid`};const json=v=>`convert_from(decode('${Buffer.from(JSON.stringify(v)).toString('hex')}','hex'),'UTF8')::jsonb`;
const q=sql=>JSON.parse(execFileSync('docker',['exec','-i',cid,'psql','-X','-h','/tmp','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],{input:`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${uid}',false) \\g /dev/null\n${sql};\n`,encoding:'utf8',timeout:20000,maxBuffer:10*1024*1024}).trim());
const snapshot=()=>q(`SELECT public.vault_macro02_active_snapshot_r5(${uuid(ep)})`);
const enroll=()=>q('SELECT public.vault_macro02_read_enrollment_r5()');
const ledger=ids=>q(`SELECT public.vault_macro02_read_active_receipts_r7(${uuid(ep)},ARRAY[${ids.map(uuid).join(',')}]::uuid[])`);
const user={id:uid,aud:'authenticated',role:'authenticated',email:'synthetic@example.invalid',app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:'2026-01-01T00:00:00.000Z',updated_at:'2026-01-01T00:00:00.000Z',is_anonymous:false};
const exp=Math.floor(Date.now()/1000)+86400,enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),token=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:uid,aud:'authenticated',role:'authenticated',exp,iat:exp-86400})}.c3ludGhldGlj`,session={access_token:token,refresh_token:'synthetic-no-refresh',token_type:'bearer',expires_in:86400,expires_at:exp,user};
const settings={id:'00000000-0000-4000-8000-000000000777',user_id:uid,default_person_id:pid,created_at:'2026-01-01T00:00:00.000Z',updated_at:'2026-01-01T00:00:00.000Z'};
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8','.webp':'image/webp'};
const clinical=new Set(['dose_logs','medicamentos','renovacoes','retiradas','persons','documents','medicos','farmacias','hospitais','locais','tratamentos','cids','fornecimentos','fornecimento_ciclos','fornecimento_itens','fornecimento_documentos','a1_treatment_phases','a1_prescription_links','a1_supply_locations','medicamento_tratamentos']);
const calls=[],denied=new Set(),emptyReads=new Set();let discardCompound=false,held=false,blocked=false;
const response=(res,code,value,headers={})=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store',...headers});res.end(JSON.stringify(value));};
const bad=(res,status,msg)=>response(res,status,{message:msg,code:'LAB_ONLY',details:null,hint:null});
const body=req=>new Promise((resolve,reject)=>{let b='';req.on('data',x=>{b+=x;if(b.length>2e6)req.destroy();});req.on('end',()=>{try{resolve(b?JSON.parse(b):{})}catch(e){reject(e)}});req.on('error',reject);});
const selectRows=(t)=>t==='settings'?[settings]:clinical.has(t)?q(`SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) FROM public.${t} r`):(emptyReads.add(t),[]);
function filters(rows,u){for(const [k,v] of u.searchParams){if(['select','order','limit','offset','on_conflict'].includes(k))continue;if(!/^[a-zA-Z0-9_]+$/.test(k))continue;if(v.startsWith('eq.'))rows=rows.filter(r=>String(r[k])===v.slice(3));else if(v.startsWith('in.('))rows=rows.filter(r=>v.slice(4,-1).split(',').map(x=>x.replace(/^"|"$/g,'')).includes(String(r[k])));else if(v.startsWith('gte.'))rows=rows.filter(r=>String(r[k])>=v.slice(4));else if(v.startsWith('lte.'))rows=rows.filter(r=>String(r[k])<=v.slice(4));else if(v==='is.null')rows=rows.filter(r=>r[k]==null);}
 const off=Number(u.searchParams.get('offset')||0),lim=Number(u.searchParams.get('limit')||rows.length);return rows.slice(off,off+lim);}
const server=http.createServer(async(req,res)=>{try{
 if(blocked){req.socket.destroy();return;}
 const u=new URL(req.url,origin),n=decodeURIComponent(u.pathname);
 if(n.startsWith('/auth/v1/')||n.startsWith('/rest/v1/')){
  if(req.headers.authorization!==`Bearer ${token}`)return bad(res,401,'Synthetic identity not authenticated');
  if(n==='/auth/v1/user'&&req.method==='GET')return response(res,200,user);
  if(n.startsWith('/rest/v1/rpc/')&&req.method==='POST'){
   const name=n.split('/').at(-1),b=await body(req);let sql;
   switch(name){
    case 'vault_macro02_read_enrollment_r5':sql='SELECT public.vault_macro02_read_enrollment_r5()';break;
    case 'vault_macro02_active_snapshot_r5':sql=`SELECT public.${name}(${uuid(b.p_epoch)})`;break;
    case 'vault_macro02_read_active_receipts_r7':sql=`SELECT public.${name}(${uuid(b.p_epoch)},ARRAY[${b.p_ids.map(uuid).join(',')}]::uuid[])`;break;
    case 'vault_macro02_read_dose_receipts':sql=`SELECT public.${name}(ARRAY[${b.p_ids.map(uuid).join(',')}]::uuid[])`;break;
    case 'vault_macro02_commit_atomic_r5':sql=`SELECT public.${name}(${uuid(b.p_epoch)},${json(b.p_intent)})`;break;
    case 'vault_macro02_commit_metadata_r5':case 'vault_macro02_commit_compound_r6':sql=`SELECT public.${name}(${json(b.p_intent)})`;break;
    default:denied.add(name);return bad(res,404,'RPC outside the synthetic gate');
   }
   // Real SQL, even when the subsequent acknowledgement is intentionally lost.
   if(name==='vault_macro02_commit_compound_r6'&&held){req.socket.destroy();return;}
   const data=q(sql);calls.push({name,b,data});
   if(name==='vault_macro02_commit_compound_r6'&&discardCompound){discardCompound=false;held=true;req.socket.destroy();return;}
   return response(res,200,data);
  }
  if(n.startsWith('/rest/v1/')&&['GET','HEAD'].includes(req.method)){
   const t=n.split('/').at(-1);if(!/^[a-zA-Z0-9_]+$/.test(t))return bad(res,404,'Invalid table');
   const rows=filters(selectRows(t),u);const h={'Content-Range':`${rows.length?`0-${rows.length-1}`:'*'}/${rows.length}`};
   if(req.method==='HEAD'){res.writeHead(200,h);return res.end();}
   if((req.headers.accept||'').includes('vnd.pgrst.object'))return rows.length===1?response(res,200,rows[0],h):bad(res,406,'No single fixture row');
   return response(res,200,rows,h);
  }
  denied.add(`${req.method} ${n}`);return bad(res,403,'Ordinary write denied: this gate only permits certified RPCs');
 }
 if(n==='/__vault_lab_bootstrap'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});return res.end('<!doctype html><html><body>Isolated synthetic bootstrap</body></html>');}
 let f=path.resolve(root,'.'+n);if(f!==root&&!f.startsWith(root+path.sep))return bad(res,403,'Path');
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f)&&fs.existsSync(f+'.html'))f+='.html';
 if(!fs.existsSync(f)){res.writeHead(404);return res.end('not found');}res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':n==='/sw.js'?'no-cache':'public, max-age=0'});fs.createReadStream(f).pipe(res);
 }catch(e){console.error('LAB_TRANSPORT_ERROR',String(e.message).slice(0,700));if(!res.headersSent&&!res.destroyed)bad(res,500,'Real PostgreSQL rejected the request');else res.destroy();}});
const sockets=new Set();server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});
// Independent network probe: no Chromium cache or service worker involved.
const probe=()=>new Promise((resolve,reject)=>{const r=http.get(origin+'/__vault_lab_bootstrap',{agent:false},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});r.setTimeout(5000,()=>r.destroy(Error('probe timeout')));r.on('error',reject);});
const wait=async(fn,label,ms=120000)=>{const deadline=Date.now()+ms;let last;while(Date.now()<deadline){try{last=await fn();if(last)return last}catch(e){last=e.message}await new Promise(r=>setTimeout(r,500));}throw Error(`${label}: ${String(last)}`)};
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'vault-active-ui-'));let ctx,page;const logs=process.env.UI_GATE_DIR;
const attach=async()=>{await page.addScriptTag({path:process.env.BOOTSTRAP_BUNDLE});};
const local=()=>page.evaluate(()=>window.__vaultLab.state());const med=(s,id)=>s.rows.medicamentos.find(x=>x.id===id);const localMed=(s,id)=>s.meds.find(x=>x.id===id);
const navigate=async(route)=>{const r=await page.goto(origin+route,{waitUntil:'domcontentloaded'});assert.equal(r.status(),200,route);};
const center=()=>page.getByRole('region',{name:'Central de Doses'});
const open=async()=>{const c=await chromium.launchPersistentContext(profile,{headless:true,viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,timezoneId:'America/Sao_Paulo',locale:'pt-BR',serviceWorkers:'allow',args:['--no-sandbox']});await c.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());return c;};
const track=p=>{p.on('pageerror',e=>console.error('PAGE_ERROR',e.message));p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log('BROWSER_'+m.type().toUpperCase(),m.text().slice(0,400));});};
const screenshot=async(name)=>{await page.screenshot({path:path.join(logs,name+'.png'),fullPage:true});};
(async()=>{
 assert.equal(enroll().state,'premium');const s0=snapshot();assert.equal(med(s0,mid).estoque_quantidade,10);assert.equal(med(s0,mid2).estoque_quantidade,7);
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4173,'127.0.0.1',resolve);});ctx=await open();page=ctx.pages()[0]||await ctx.newPage();track(page);
 await navigate('/__vault_lab_bootstrap');await page.evaluate(s=>localStorage.setItem('sb-127-auth-token',JSON.stringify(s)),session);await attach();await page.evaluate(({s,settings})=>window.__vaultLab.seed(s,settings),{s:s0,settings});assert.equal((await local()).device,undefined);
 // A real account in Premium must not activate a new device automatically.
 await navigate('/hoje');await page.getByRole('heading',{name:'Conferência de autoridade clínica'}).waitFor({timeout:120000});await screenshot('01-hold');assert.equal(await center().count(),0);await page.getByRole('link',{name:'Abrir Central de segurança'}).click();await page.getByRole('button',{name:'Conferir aparelho',exact:true}).waitFor({timeout:120000});await page.getByRole('button',{name:'Conferir aparelho',exact:true}).click();await page.getByText('Aparelho conferido com a base remota.',{exact:false}).waitFor({timeout:120000});await attach();assert.equal((await local()).device.epoch,ep);assert(calls.filter(c=>c.name==='vault_macro02_active_snapshot_r5').length>=2);console.log('UI_DEVICE_REAL_VERIFICATION_PASS');
 await navigate('/hoje');await center().waitFor({timeout:120000});await center().getByRole('button',{name:'Pendentes',exact:true}).click();await screenshot('02-central-premium');
 // Real stock count UI, not an injected cycle. Verify the PostgreSQL acknowledgement.
 await navigate(`/saude/medicamentos/saldo?id=${mid}&return_to=%2Fhoje`);await page.getByText('QA Dose Sintetica',{exact:true}).waitFor({timeout:120000});await page.getByLabel('Quantidade disponível agora').fill('10');await page.getByRole('button',{name:'Confirmar contagem',exact:true}).click();await page.waitForURL(/\/hoje(?:\?|$)/,{timeout:120000});await center().waitFor({timeout:120000});await attach();await wait(async()=>{const x=await local();return localMed(x,mid)?.estoque_ciclo_id&&x.queue.every(q=>!q.payload?.macro02_atomic&&!q.payload?.macro02_compound&&!q.payload?.macro02_metadata)&&med(snapshot(),mid).estoque_ciclo_id===localMed(x,mid).estoque_ciclo_id},'Stock count ack');console.log('UI_PHYSICAL_COUNT_REAL_PG_PASS');
 // Real transport outage: local UI must still write under verified offline Premium authority.
 await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,{},{timeout:60000});await page.reload({waitUntil:'domcontentloaded'});await center().waitFor({timeout:60000});await attach();await page.waitForFunction(async()=>!!await (await caches.open('vault-shell-v25-6')).match('/hoje'),{},{timeout:30000});await center().getByRole('button',{name:'Pendentes',exact:true}).click();
 // No modal pre-open and no test-only cache writes: require the normal route assets.
 assert.equal(await page.getByRole('heading',{name:'Registrar Dose',exact:true}).count(),0);
 await page.waitForFunction(async()=>{const c=await caches.open('vault-shell-v25-6');const urls=[...document.scripts].map(s=>s.src).filter(x=>x.startsWith(location.origin+'/_next/static/')&&x.endsWith('.js'));return urls.length>0&&(await Promise.all(urls.map(u=>c.match(u)))).every(Boolean);},{},{timeout:60000});
 console.log('UI_INITIAL_ROUTE_SCRIPTS_CACHED_WITHOUT_OPENING_DIALOG_PASS');
 assert.equal(await probe(),200);blocked=true;for(const socket of sockets)socket.destroy();await ctx.setOffline(true);await page.waitForFunction(()=>navigator.onLine===false);await assert.rejects(probe(),e=>['ECONNRESET','EPIPE','ECONNREFUSED'].includes(e.code),'origin transport must be unavailable');console.log('UI_REAL_TRANSPORT_OUTAGE_PASS');await center().waitFor({timeout:60000});
 await center().getByRole('button',{name:'Conferir dose de QA Dose Sintetica, 00:00',exact:true}).click();await page.getByRole('button',{name:'Tomar',exact:true}).click();await page.getByRole('heading',{name:'Registrar Dose',exact:true}).waitFor({timeout:60000});await page.getByRole('button',{name:'comprimido',exact:true}).click();await screenshot('03-dose-explicit-unit');await page.getByRole('button',{name:'Registrar tomada agora',exact:true}).click();await page.getByRole('button',{name:/^Tomei às 00:00/}).click();
 await wait(async()=>{const x=await local();return x.doses.some(d=>d.medicamento_id===mid&&d.horario==='00:00'&&d.tomado_em&&d.unidade_dose==='tablet'&&d.quantidade===1)&&localMed(x,mid).estoque_quantidade===9&&x.queue.some(q=>q.payload?.macro02_atomic&&q.payload?.macro02_epoch===ep)},'Offline real dose and queue');assert.equal(med(snapshot(),mid).estoque_quantidade,10);console.log('UI_OFFLINE_DOSE_NATIVE_INDEXEDDB_PASS');
 // Unquantified acquisition enters via the actual production repository (not a UI claim).
 const before=(await local());const rxid=await page.evaluate(()=>window.__vaultLab.unquantified());let after=await local();assert.equal(localMed(after,mid2).estoque_quantidade,7);assert.equal(localMed(after,mid2).estoque_ciclo_id,localMed(before,mid2).estoque_ciclo_id);const compound=after.queue.find(q=>q.payload?.macro02_compound?.kind==='acquisition-unquantified');assert(compound);assert.equal(after.rx.find(r=>r.id===rxid).quantidade,null);const op=compound.payload.macro02_compound.operation_id;const backup=await page.evaluate(()=>window.__vaultLab.backup());assert(backup.includes(op));console.log('BROWSER_COMPOUND_NATIVE_INDEXEDDB_AND_BACKUP_PASS');
 // New document navigation while disconnected must load the actual cached page, not a stub.
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>navigator.onLine===false);await center().waitFor({timeout:60000});await attach();after=await local();assert(after.queue.some(q=>q.payload?.macro02_compound?.operation_id===op));assert.equal(localMed(after,mid).estoque_quantidade,9);assert.equal(localMed(after,mid2).estoque_quantidade,7);await center().getByRole('button',{name:'Histórico',exact:true}).click();await center().getByText('Tomada registrada',{exact:true}).waitFor({timeout:30000});await screenshot('04-history-offline');console.log('UI_OFFLINE_RELOAD_AND_HISTORY_PASS');
 // Reconnect and intentionally discard one genuine compound ACK. Do not forge a success.
 discardCompound=true;blocked=false;await ctx.setOffline(false);await page.waitForFunction(()=>navigator.onLine===true);await page.evaluate(()=>window.dispatchEvent(new Event('sync:process')));
 await wait(()=>held,'Lost compound response');assert.equal(med(snapshot(),mid2).estoque_quantidade,7);assert.equal(snapshot().rows.renovacoes.filter(r=>r.id===rxid).length,1);assert.equal(ledger([op]).rows[0].status,'committed');assert((await local()).queue.some(q=>q.payload?.macro02_compound?.operation_id===op));console.log('UI_COMPOUND_LOST_ACK_REAL_LEDGER_PASS');
 await wait(()=>snapshot().rows.doseLogs.some(d=>d.medicamento_id===mid&&d.horario==='00:00'&&d.tomado_em),'Dose remote receipt');await navigate('/recuperacao');await page.getByLabel('Selecionar backup de doses').waitFor({timeout:60000});await page.getByLabel('Selecionar backup de doses').setInputFiles({name:'synthetic-backup.json',mimeType:'application/json',buffer:Buffer.from(backup)});await page.getByText(/2 intenção\(ões\) conferida\(s\): 2 com recibo íntegro e 0 precisam de revisão de estado remoto\. Nenhuma operação foi reenviada nem restaurada/).waitFor({timeout:120000});await screenshot('05-recovery-receipt');console.log('UI_BACKUP_ACTIVE_RECEIPT_READ_PASS');
 held=false;await attach();await page.evaluate(()=>window.dispatchEvent(new Event('sync:process')));await wait(async()=>{await page.evaluate(()=>window.dispatchEvent(new Event('sync:process')));const x=await local();return !x.queue.some(q=>q.payload?.macro02_compound?.operation_id===op||q.payload?.macro02_atomic)&&localMed(x,mid).estoque_quantidade===9&&x.rx.some(r=>r.id===rxid&&r.synced===true)},'Reconnect and finalization',180000);
 const end=snapshot();assert.equal(med(end,mid).estoque_quantidade,9);assert.equal(med(end,mid2).estoque_quantidade,7);assert.equal(end.rows.doseLogs.filter(d=>d.medicamento_id===mid&&d.horario==='00:00'&&d.tomado_em).length,1);assert.equal(end.rows.renovacoes.filter(r=>r.id===rxid&&r.quantidade===null).length,1);const sends=calls.filter(c=>c.name==='vault_macro02_commit_compound_r6'&&c.b.p_intent.operation_id===op);assert(sends.length>=2);assert.deepEqual(sends[0].b,sends.at(-1).b);assert.deepEqual(sends[0].data,sends.at(-1).data);console.log('UI_RECONNECT_EXACT_RETRY_NO_DUPLICATE_PASS');
 await navigate('/hoje');await center().waitFor({timeout:60000});await center().getByRole('button',{name:'Histórico',exact:true}).click();await center().getByText('Tomada registrada',{exact:true}).waitFor({timeout:30000});await screenshot('06-final-history');
 console.log('LAB_READ_ADAPTER_EMPTY_OUTSIDE_CLINICAL_SCOPE='+JSON.stringify([...emptyReads].sort()));console.log('LAB_DENIED_UNSUPPORTED_REQUESTS='+JSON.stringify([...denied].sort()));console.log('MACRO02_ACTIVE_PREMIUM_BROWSER_PG17_GATE_PASS');
})().catch(async e=>{console.error('ACTIVE_UI_GATE_FAIL',e.stack||e.message);process.exitCode=1;try{if(page){await screenshot('failure');fs.writeFileSync(path.join(logs,'failure.html'),await page.content());console.log('PAGE_URL='+page.url());console.log('PAGE_TEXT='+String(await page.locator('body').innerText()).slice(0,2500));}}catch{}}).finally(async()=>{blocked=false;if(ctx)await ctx.close();for(const s of sockets)s.destroy();await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true});});
