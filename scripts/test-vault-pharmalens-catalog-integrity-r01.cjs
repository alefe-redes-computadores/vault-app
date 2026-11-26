'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {codesOf,reconcileOfficialRows,parsePresentationLabel,reconcileSnapshot}=require('./medication-catalog/catalog-integrity-r01.cjs');
const {readTable,TABLES}=require('./medication-catalog/catalog-integrity-snapshot-r01.cjs');
const {audit,run}=require('./medication-catalog/catalog-integrity-dry-run-r01.cjs');
let pass=0,fail=0;const tasks=[];function check(name,fn){tasks.push([name,fn]);}
const row=(id,codes,name,over={})=>({CO_SEQ_PRODUTO:id,NO_PRODUTO:'Produto '+id,NU_REGISTRO_PRODUTO:'10000000'+id,NO_RAZAO_SOCIAL_EMPRESA:'Laboratório teste',VALIDADE_SITUACAO:'ATIVO',CO_SUBSTANCIA:codes,SUBSTANCIAS_MEDICAMENTOS:name,DS_TIPO_CATEGORIA_REGULATORIA:'Novo',...over});
const base=[row('1','101','Alfa'),row('2','202','Beta'),row('3','202,101','Alfa; Beta')];
const record=(o,id)=>o.reports.find(r=>r.productExternalId===id);
const core=()=>reconcileOfficialRows(base);
check('separação de códigos e zero à esquerda preservado',()=>assert.deepEqual(codesOf('001, 2'),['001','2']));
for(const x of ['1,1','1;2','1,','foo','0'])check('código inválido '+x,()=>assert.equal(codesOf(x),null));
check('ausência não inventa código',()=>assert.deepEqual(codesOf(''),[]));
check('reconcilia código individual a partir de testemunhos unitários',()=>assert.equal(core().substances.size,2));
check('associação sem alinhamento posicional',()=>assert.deepEqual(record(core(),'3').resolved.map(s=>s.code),['101','202']));
check('associação completa gera dois vínculos',()=>assert.equal([...core().relations.values()].filter(r=>r.productExternalId==='3').length,2));
check('ordem de nomes invertida mantém conjunto',()=>assert.equal(record(reconcileOfficialRows([...base.slice(0,2),row('3','101,202','Beta + Alfa')]),'3').status,'complete'));
check('separador vírgula só com conjunto exato',()=>assert.equal(record(reconcileOfficialRows([...base.slice(0,2),row('3','101,202','Beta, Alfa')]),'3').status,'complete'));
check('concentração ou marca não resolvem código ausente',()=>assert.equal(record(reconcileOfficialRows([...base.slice(0,2),row('4','101,999','Alfa; Gama')]),'4').status,'partial'));
check('parcial não gera vínculo automático',()=>assert.equal([...reconcileOfficialRows([...base.slice(0,2),row('4','101,999','Alfa; Gama')]).relations.values()].filter(r=>r.productExternalId==='4').length,0));
check('nomes incompatíveis bloqueiam mesmo com todos os códigos',()=>assert.equal(record(reconcileOfficialRows([...base.slice(0,2),row('3','101,202','Alfa; Gama')]),'3').status,'ambiguous'));
check('código com nomes conflitantes bloqueia',()=>assert.equal(record(reconcileOfficialRows([...base,row('4','101','Outro sal')]),'3').status,'ambiguous'));
check('nome normalizado igual entre códigos bloqueia',()=>assert.equal(record(reconcileOfficialRows([...base,row('4','303','Alfa')]),'3').status,'ambiguous'));
check('não colapsa sais distintos',()=>assert.equal(record(reconcileOfficialRows([...base.slice(0,2),row('3','101,202','Alfa; cloridrato de Beta')]),'3').status,'ambiguous'));
check('produto com conjuntos conflitantes bloqueia',()=>assert.equal(record(reconcileOfficialRows([...base,row('3','101','Alfa')]),'3').status,'ambiguous'));
check('identidade de produto conflitante bloqueia',()=>assert.equal(record(reconcileOfficialRows([...base,row('3','202,101','Beta; Alfa',{NU_REGISTRO_PRODUTO:'999'})]),'3').status,'ambiguous'));
check('testemunho de produto contraditório não autoriza outros vínculos',()=>{const r=reconcileOfficialRows([row('1','101','Alfa'),row('1','101','Alfa',{NU_REGISTRO_PRODUTO:'999'}),row('2','202','Beta'),row('3','101,202','Alfa; Beta')]);assert.equal(record(r,'3').status,'ambiguous');});
check('reimportação de linhas iguais não duplica relação',()=>assert.equal(reconcileOfficialRows([...base,...base]).relations.size,core().relations.size));
check('nome ausente não confirma código',()=>assert.equal(record(reconcileOfficialRows([...base,row('4','404','')]),'4').status,'inconclusive'));
check('código único com texto composto não vira substância inventada',()=>assert.equal(record(reconcileOfficialRows([row('4','404','Alfa + Beta')]),'4').status,'inconclusive'));
check('placeholder não serve de testemunho',()=>assert.equal(record(reconcileOfficialRows([row('4','404','Alfa',{NO_PRODUTO:'não declarado'})]),'4').status,'inconclusive'));
const prs=[['0,4MG/ML + 140MG/ML SOL OTO CT FR PLAS OPC GOT X 8 ML',2,'otologica','solução otológica',null],['2,0 MG + 10 MG/ML SUS OTO CT FR OPC GOT X 5 ML',2,'otologica','suspensão otológica',null],['2,5MG/ML SOL OR CT FR GOT X 20 ML',1,'oral','solução oral',null],['100 MG COM REV LIB CONT CT BL X 30',1,null,'comprimido revestido','liberacao_controlada'],['100 MG COM REV LIB PROL CT BL X 30',1,null,'comprimido revestido','liberacao_prolongada'],['10 MG/ML SOL OFT CT FR 5 ML',1,'oftalmica','solução oftálmica',null]];
for(const [label,n,route,form,release] of prs)check('rótulo '+label,()=>{const p=parsePresentationLabel(label);assert.equal(p.strengths.length,n);assert.equal(p.route,route);assert.equal(p.form,form);assert.equal(p.release,release);assert.equal(p.status,'parsed_candidate');});
check('decimal sem mudança de escala',()=>assert.equal(parsePresentationLabel(prs[0][0]).strengths[0].value,'0.4'));
check('embalagem não vira concentração',()=>assert.equal(parsePresentationLabel('SOL OTO CT FR X 8 ML').strengths.length,0));
check('denominador não suportado não vira dose simples',()=>assert.equal(parsePresentationLabel('10 MG/5ML SOL OR').strengths.length,0));
check('zero inválido',()=>assert.equal(parsePresentationLabel('0 MG COM').strengths.length,0));
check('via conflituosa não selecionada',()=>assert.equal(parsePresentationLabel('10 MG/ML SOL OTO OFT').status,'inconclusive'));
check('liberação conflituosa não selecionada',()=>assert.equal(parsePresentationLabel('10 MG COM LIB CONT LIB PROL').status,'inconclusive'));
const snapshot=()=>({products:[{id:'p',external_id:'3',product_name:'Produto 3',registration_number:'100000003',manufacturer:'Laboratório teste',active:true}],substances:[{id:'a',external_id:'101',canonical_name:'Alfa',canonical_name_normalized:'alfa',active:true},{id:'b',external_id:'202',canonical_name:'Beta',canonical_name_normalized:'beta',active:true}],links:[],presentations:[],versions:[],aliases:[],rules:[],exceptions:[],identities:[],memberships:[],evidence:[]});
check('dois vínculos propostos com IDs existentes',()=>assert.equal(reconcileSnapshot(snapshot(),core()).additions.length,2));
check('preserva snapshot original',()=>{const s=snapshot(),before=JSON.stringify(s);reconcileSnapshot(s,core());assert.equal(JSON.stringify(s),before);});
check('reimportação idempotente',()=>{const s=snapshot(),r=reconcileSnapshot(s,core());s.links=r.additions;assert.equal(reconcileSnapshot(s,core()).additions.length,0);});
check('reconcilia associação anteriormente parcial sem remover vínculo',()=>{const s=snapshot();s.links=[{product_id:'p',substance_id:'a',external_substance_id:'101'}];const r=reconcileSnapshot(s,core());assert.deepEqual(r.additions.map(x=>x.substance_id),['b']);});
check('código externo duplicado impede alteração',()=>{const s=snapshot();s.substances.push({...s.substances[0],id:'a2'});assert.equal(reconcileSnapshot(s,core()).additions.length,0);});
check('nome incompatível impede alteração',()=>{const s=snapshot();s.substances[0].canonical_name='Outro';assert.equal(reconcileSnapshot(s,core()).additions.length,0);});
check('substância ausente não cria UUID',()=>{const s=snapshot();s.substances.pop();assert.equal(reconcileSnapshot(s,core()).additions.length,0);});
check('produto de mesmo nome mas registro diferente bloqueia',()=>{const s=snapshot();s.products[0].registration_number='999';assert.equal(reconcileSnapshot(s,core()).additions.length,0);});
check('fabricante diferente bloqueia',()=>{const s=snapshot();s.products[0].manufacturer='Outro laboratório';assert.equal(reconcileSnapshot(s,core()).additions.length,0);});
check('status divergente bloqueia',()=>{const s=snapshot();s.products[0].active=false;assert.equal(reconcileSnapshot(s,core()).additions.length,0);});
check('link histórico incompatível preservado e segregado',()=>{const s=snapshot();s.links=[{product_id:'p',substance_id:'x'}];assert.equal(reconcileSnapshot(s,core()).reports[0].status,'ambiguous');assert.equal(s.links.length,1);});
check('auditoria detecta produto e substância sem link',()=>{const a=audit(snapshot());assert.equal(a.groups[0].unlinked,1);assert.equal(a.problems.unlinkedSubstances.length,2);});
check('auditoria detecta órfão',()=>{const s=snapshot();s.links.push({product_id:'p',substance_id:'x'});assert.equal(audit(s).problems.orphanLinks.length,1);});
check('exportador nunca consulta tabelas clínicas pessoais',()=>assert(!Object.values(TABLES).flat().some(v=>typeof v==='string'&&/candidates|dose|person|medicamentos/i.test(v))));
function mock(rows){return{from(){let q={select(){return q;},order(){return q;},range(a,b){return Promise.resolve({data:rows.slice(a,b+1),count:rows.length,error:null});}};return q;}};}
check('paginação completa com 1001 linhas',async()=>assert.equal((await readTable(mock(Array.from({length:1001},(_,id)=>({id}))), 'medication_products',['id'])).length,1001));
check('paginação detecta duplicata',async()=>await assert.rejects(()=>readTable(mock([{id:1},{id:1}]),'medication_products',['id'])));
// R02: prove review-only replay, drift rejection and exact selective rollback.
const {historicalCodeAudit,buildReviewPlan,bindSources,replayReviewPlan,rollbackReviewPlan,digest}=require('./medication-catalog/catalog-integrity-review-r02.cjs');
check('R02 row without code and conflicting name blocks composition',()=>assert.equal(record(reconcileOfficialRows([...base,row('3','','Alfa; Gama')]),'3').status,'ambiguous'));
check('R02 row without code but corroborated text does not fabricate link',()=>assert.equal(record(reconcileOfficialRows([...base,row('3','','Beta; Alfa')]),'3').status,'complete'));
check('R02 all-or-none association group and unknown position/primary',()=>{const p=buildReviewPlan(snapshot(),core());assert.deepEqual(p.counts,{products:1,links:2});assert.equal(p.groups[0].operations.length,2);assert.deepEqual(p.groups[0].writeContract,{source_version_id:'REQUIRES_VERIFIED_NEW_SOURCE_VERSION',position:null,is_primary:false});assert.equal(p.productionWrites,0);});
check('R02 replay idempotent and rollback exact',()=>{const s=snapshot(),p=buildReviewPlan(s,core()),a=replayReviewPlan(s,p);assert.equal(a.links.length,2);assert.equal(digest(replayReviewPlan(a,p)),digest(a));assert.equal(digest(rollbackReviewPlan(a,p)),digest(s));assert.equal(s.links.length,0);});
check('R02 rollback preserves historical link byte-for-byte',()=>{const s=snapshot();s.links=[{product_id:'p',substance_id:'a',external_substance_id:'101',position:null,is_primary:false,created_at:'historical'}];const p=buildReviewPlan(s,core()),a=replayReviewPlan(s,p);assert.equal(p.counts.links,1);assert.deepEqual(rollbackReviewPlan(a,p),s);});
check('R02 plan tampering fails seal',()=>{const s=snapshot(),p=buildReviewPlan(s,core());p.groups[0].operations[0].row.external_substance_id='999';assert.throws(()=>replayReviewPlan(s,p),/integrity mismatch/);});
check('R02 drift before replay fails closed',()=>{const s=snapshot(),p=buildReviewPlan(s,core());s.products[0].product_name='Outra identidade';assert.throws(()=>replayReviewPlan(s,p),/snapshot drift/);});
check('R02 drift before rollback preserves unrelated changes',()=>{const s=snapshot(),p=buildReviewPlan(s,core()),a=replayReviewPlan(s,p);a.links[0]={...a.links[0],position:1};assert.throws(()=>rollbackReviewPlan(a,p),/snapshot drift/);assert.equal(a.links.length,2);});
check('R02 existing orphan rejects plan',()=>{const s=snapshot();s.links.push({product_id:'p',substance_id:'unknown'});assert.throws(()=>buildReviewPlan(s,core()),/orphan link/);});
check('R02 duplicate pair rejects plan',()=>{const s=snapshot(),l={product_id:'p',substance_id:'a',external_substance_id:'101'};s.links=[l,{...l}];assert.throws(()=>buildReviewPlan(s,core()),/duplicate link/);});
check('R02 duplicate official product report rejects plan',()=>{const o=core();o.reports.push(o.reports[0]);assert.throws(()=>buildReviewPlan(snapshot(),o),/duplicate official product/);});
check('R02 missing external code with multiple historical codes quarantined',()=>{const s=snapshot();s.substances[0].external_id=null;s.products.push({...s.products[0],id:'p2',external_id:'2'});s.links=[{product_id:'p',substance_id:'a',external_substance_id:'101'},{product_id:'p2',substance_id:'a',external_substance_id:'303'}];const a=historicalCodeAudit(s,core());assert.equal(a.reviews[0].status,'ambiguous');assert.deepEqual(a.reviews[0].historicalCodes,['101','303']);assert.equal(a.automaticUpdates,0);});
check('R02 single historical code with exact official name only review candidate',()=>{const s=snapshot();s.substances[0].external_id=null;s.links=[{product_id:'p',substance_id:'a',external_substance_id:'101'}];const a=historicalCodeAudit(s,core());assert.equal(a.reviews[0].status,'review_candidate');assert.equal(s.substances[0].external_id,null);});
check('R02 historical code claimed by different IDs is ambiguous',()=>{const s=snapshot();s.substances[0].external_id=null;s.substances[1].external_id='101';s.links=[{product_id:'p',substance_id:'a',external_substance_id:'101'}];assert.equal(historicalCodeAudit(s,core()).reviews[0].status,'ambiguous');});
check('R02 absence of official corroboration remains inconclusive',()=>{const s=snapshot();s.substances[0].external_id=null;s.links=[{product_id:'p',substance_id:'a',external_substance_id:'303'}];assert.equal(historicalCodeAudit(s,core()).reviews[0].status,'inconclusive');});
check('R02 known external code conflicting with link is quarantined',()=>{const s=snapshot();s.links=[{product_id:'p',substance_id:'a',external_substance_id:'303'}];assert.equal(historicalCodeAudit(s,core()).reviews[0].status,'ambiguous');assert.equal(buildReviewPlan(s,core()).counts.links,0);});
const sourceFixture=()=>({status:'COMPLETE',sources:['TA_CONSULTA_MEDICAMENTOS.CSV','TA_PRECOS_MEDICAMENTOS.csv','TA_RESTRICAO_MEDICAMENTO.csv'].map(name=>({name,status:'DOWNLOADED',sha256:'a'.repeat(64),bytes:10,url:'https://dados.anvisa.gov.br/'+name,effectiveUrl:'https://dados.anvisa.gov.br/'+name}))});
const snapshotManifestFixture=s=>({status:'DOUBLE_READ_MATCH',sha256:digest(s)});
check('R02 source manifest binds plan with no productive authorization',()=>{const s=snapshot(),p=bindSources(buildReviewPlan(s,core()),sourceFixture(),snapshotManifestFixture(s));assert.equal(p.sources.length,3);assert.equal(p.sourceVersionBinding,'BY_HASH_REVIEW_ONLY');assert.equal(p.productionWrites,0);assert.equal(replayReviewPlan(s,p).links.length,2);});
check('R02 source duplicate rejects manifest',()=>{const s=snapshot(),m=sourceFixture();m.sources.push(m.sources[0]);assert.throws(()=>bindSources(buildReviewPlan(s,core()),m,snapshotManifestFixture(s)),/missing or duplicate/);});
check('R02 wrong snapshot hash rejects manifest',()=>{const s=snapshot();assert.throws(()=>bindSources(buildReviewPlan(s,core()),sourceFixture(),{status:'DOUBLE_READ_MATCH',sha256:'wrong'}),/does not match/);});
check('R02 untrusted source destination rejects manifest',()=>{const s=snapshot(),m=sourceFixture();m.sources[0].effectiveUrl='https://example.com/official.csv';assert.throws(()=>bindSources(buildReviewPlan(s,core()),m,snapshotManifestFixture(s)),/invalid official origin/);});
check('R02 missing source hash rejects manifest',()=>{const s=snapshot(),m=sourceFixture();delete m.sources[0].sha256;assert.throws(()=>bindSources(buildReviewPlan(s,core()),m,snapshotManifestFixture(s)),/invalid source evidence/);});
check('R02 zero operations replay and rollback preserve snapshot',()=>{const s=snapshot();s.products=[];const p=buildReviewPlan(s,core());assert.equal(p.counts.links,0);assert.deepEqual(replayReviewPlan(s,p),s);assert.deepEqual(rollbackReviewPlan(s,p),s);});
check('R02 global conflicting historical code prevents propagation to another product',()=>{const s=snapshot();s.products.push({...s.products[0],id:'other',external_id:'99'});s.links=[{product_id:'other',substance_id:'a',external_substance_id:'303'}];assert.equal(buildReviewPlan(s,core()).counts.links,0);});
check('R02 historical claim from code-less ID blocks another explicit code holder',()=>{const s=snapshot();s.products.push({...s.products[0],id:'other',external_id:'99'});s.substances.push({id:'z',external_id:null,canonical_name:'Gamma',canonical_name_normalized:'gamma',active:true});s.links=[{product_id:'other',substance_id:'z',external_substance_id:'101'}];assert.equal(buildReviewPlan(s,core()).counts.links,0);});
check('R02 plan includes preimages of all linked substances',()=>{const s=snapshot();s.links=[{product_id:'p',substance_id:'a',external_substance_id:'101'}];const p=buildReviewPlan(s,core());assert.deepEqual(p.groups[0].preSubstances.map(x=>x.id).sort(),['a','b']);});
check('R02 postimage mutation does not mutate sealed plan',()=>{const s=snapshot(),p=buildReviewPlan(s,core()),a=replayReviewPlan(s,p);a.links[0].external_substance_id='changed';assert.throws(()=>rollbackReviewPlan(a,p),/snapshot drift/);assert.equal(replayReviewPlan(s,p).links.length,2);});
const {auditVerifiedExport}=require('./medication-catalog/catalog-integrity-review-r02.cjs');
const verifiedExport=s=>({snapshot:s,manifest:{status:'DOUBLE_READ_MATCH',project:'gqxqbfkcgfhsqtwjlhvz',sha256:digest(s),counts:Object.fromEntries(Object.entries(s).map(([k,v])=>[k,v.length]))}});
check('R02 independent snapshot audit without sources',()=>{const s=snapshot();const r=auditVerifiedExport(verifiedExport(s));assert.equal(r.officialComposition,'UNVERIFIED');assert.equal(r.audit.groups[0].unlinked,1);assert.equal(r.productionWrites,0);});
check('R02 snapshot audit rejects wrong project',()=>{const e=verifiedExport(snapshot());e.manifest.project='another';assert.throws(()=>auditVerifiedExport(e),/unexpected project/);});
check('R02 snapshot audit rejects modified bytes',()=>{const e=verifiedExport(snapshot());e.snapshot.products[0].product_name='changed';assert.throws(()=>auditVerifiedExport(e),/hash mismatch/);});
check('R02 snapshot audit rejects incomplete count',()=>{const e=verifiedExport(snapshot());e.manifest.counts.products=0;assert.throws(()=>auditVerifiedExport(e),/count mismatch/);});
const fixtureOnly=process.argv.includes('--fixture-only');
if(!fixtureOnly){
 const builderPath=path.join(__dirname,'medication-catalog/build-anvisa-canonical-package.js');const importerPath=path.join(__dirname,'medication-catalog/import-anvisa-initial.js');
 check('consumidor real 4D7 produz duas relações',()=>{const g=require(builderPath);const r=g.buildConsultaPackage(base);assert.equal([...r.safeRelations.values()].filter(x=>x.productExternalId==='3').length,2);});
 check('importador inicial real consome mesma composição',()=>{const i=require(importerPath);const r=i.buildCanonicalPackage(base,[]);assert.equal(r.relations.filter(x=>x.productExternalId==='3').length,2);});
 check('importador inicial preserva guarda de banco vazio e rollback legado',()=>{const src=fs.readFileSync(importerPath,'utf8');assert(src.includes('await assertInitialDatabaseEmpty('));assert(src.includes('IMPORTAÇÃO INICIAL BLOQUEADA'));assert(src.includes('position: null'));assert(src.includes('is_primary: false'));});
 check('gerador não usa bypass TLS',()=>{const s=fs.readFileSync(builderPath,'utf8');assert(s.includes('TLS_VERIFICATION_BYPASSED = false'));assert(!s.includes('"-k",'));});
 check('gerador rejeita CSV com aspas incompletas e linhas inválidas',()=>{const g=require(builderPath);assert.throws(()=>g.parseCsv('a;b\n"incompleto',';'));assert.throws(()=>g.rowsToObjects([['a','b'],['1']]));});
 check('dry-run usa consumidores reais e simula sem alterar snapshot',()=>{const s=snapshot();const result=run(s,base,[{NU_REGISTRO:'1000000030011',DS_APRESENTACAO:'10 MG COM',CO_GGREM:'10',NO_PRODUTO:'Produto 3',DS_SUBSTANCIA:'Alfa; Beta',CO_EAN:'123'}],[{NO_PRODUTO:'Produto 3',DS_RESTRICAO_PRESCRICAO:'',NO_PRINICIPIO_ATIVO:'Alfa; Beta'}]);assert.equal(result.simulation.addedLinks,2);assert.equal(result.productionWrites,0);assert.equal(s.links.length,0);});
}
if(!fixtureOnly){
 const g=require('./medication-catalog/build-anvisa-canonical-package.js'),i=require('./medication-catalog/import-anvisa-initial.js');
 const rows=t=>g.rowsToObjects(g.parseCsv(t,';'));
 check('R03 duas autoridades compartilham mesmo leitor',()=>{assert.equal(i.parseCsv,g.parseCsv);assert.equal(i.rowsToObjects,g.rowsToObjects);});
 check('R03 aspas literais no meio de campo não deslocam colunas',()=>assert.equal(rows('a;b\n1;TEXTO 2"').at(0).b,'TEXTO 2"'));
 check('R03 campos entre aspas preservam delimitador',()=>assert.equal(rows('a;b\n1;"Alfa; Beta"')[0].b,'Alfa; Beta'));
 check('R03 aspas duplicadas válidas',()=>assert.equal(rows('a;b\n1;"a""b"')[0].b,'a"b'));
 check('R03 multilinha CRLF preserva conteúdo e origem física',()=>{const x=rows('a;b\r\n1;"a\r\nb"\r\n2;c');assert.equal(x[0].b,'a\r\nb');assert.equal(x[1].__pharmalensSourceLine,4);});
 check('R03 campo vazio final legítimo',()=>assert.equal(rows('a;b\n1;')[0].b,''));
 check('R03 campo faltante rejeitado',()=>assert.throws(()=>rows('a;b\n1'),/esperado=2, recebido=1/));
 check('R03 campo excedente não truncado',()=>assert.throws(()=>rows('a;b\n1;2;'),/recebido=3/));
 check('R03 cabeçalho duplicado rejeitado',()=>assert.throws(()=>rows('a;a\n1;2'),/Cabeçalho/));
 check('R03 caractere após aspas rejeitado',()=>assert.throws(()=>rows('a;b\n1;"x"y'),/após fechamento/));
 check('R03 aspas não encerradas rejeitadas',()=>assert.throws(()=>rows('a;b\n1;"x'),/não encerradas/));
 check('R03 auditoria coleta múltiplas larguras sem aprovar',()=>{const r=g.inspectCsv('a;b\n1\n2;3;4\n5;6',';');assert.equal(r.invalid,2);assert.equal(r.examples.length,2);assert.equal(r.valid,false);assert.equal(r.good,1);});
 check('R03 origem física da composição preservada',()=>{const x=base.map((r,n)=>({...r,__pharmalensSourceLine:10+n*2}));assert.deepEqual(record(reconcileOfficialRows(x),'3').rows,[14]);});
 check('R03 linhas vazias físicas não alteram largura',()=>{const r=g.inspectCsv('a;b\n\n1;2\n;\n',';');assert.equal(r.valid,true);assert.equal(r.blank,1);assert.equal(r.allEmpty,1);assert.equal(r.good,1);});
 check('R03 última linha sem newline não desaparece',()=>assert.equal(rows('a;b\n1;""')[0].b,''));
 check('R03 linha de um campo com aspas vazias não mascara erro',()=>assert.equal(g.inspectCsv('a;b\n""\n',';').valid,false));
}
// R03 permanence: actual importer encoding and frozen-ledger reader behavior.
if(!fixtureOnly){
 const g=require('./medication-catalog/build-anvisa-canonical-package.js'),i=require('./medication-catalog/import-anvisa-initial.js');
 const {derive,verifyFields,sha}=require('./medication-catalog/catalog-lexical-review-r03.cjs');
 const fixture=()=>{
  const pre=Buffer.from('p;"F" 10 MG COM\r\n'),post=Buffer.from('p;"""F"" 10 MG COM"\r\n'),head=Buffer.from('id;DS_APRESENTACAO\r\n'),raw=Buffer.concat([head,pre]),out=Buffer.concat([head,post]),a=g.inspectCsv(out.toString(),' ;'.trim());
  const edits=[{startLine:2,endLine:2,byteOffset:head.length,overlayOffset:head.length,rawSHA256:sha(pre),postSHA256:sha(post),rawBase64:pre.toString('base64'),postBase64:post.toString('base64'),field:'DS_APRESENTACAO',rule:'LEADING_LITERAL_F_TOKEN',candidateCount:1,fieldIndex:1,rawField:'"F" 10 MG COM',interpretedField:'"F" 10 MG COM'}];
  const ledger={name:'TA_PRECOS_MEDICAMENTOS.csv',rawSHA256:sha(raw),reversedSHA256:sha(raw),overlaySHA256:sha(out),fieldDigest:a.digest,editsSHA256:sha(Buffer.from(JSON.stringify(edits))),edits,unresolved:[],counts:{proposedRepairs:1,parsedRecords:2},node:{encoding:'utf-8'},python:{header:a.header,widths:{...a.widths},blank:0}};return {raw,out,ledger};};
 const reseal=l=>l.editsSHA256=sha(Buffer.from(JSON.stringify(l.edits)));
 check('R03 deterministic CP1252 special characters across Node runtimes',()=>assert.equal(g.decodeBuffer(Buffer.from([0x80,0x92,0x93,0x94,0x96,0x99,0xe9])).text,'€’“”–™é'));
 check('R03 canonical decoder rejects undefined CP1252 rather than replacing',()=>assert.throws(()=>g.decodeBuffer(Buffer.from([0x81])),/indefinido/));
 check('R03 valid UTF8 preserves code points',()=>assert.deepEqual(g.decodeBuffer(Buffer.from('ação — ™')), {encoding:'utf-8',text:'ação — ™'}));
 check('R03 real importers share decoder and delimiter authority',()=>{assert.equal(i.decodeBuffer,g.decodeBuffer);assert.equal(i.detectDelimiter,g.detectDelimiter);});
 check('R03 frozen repair derives and reverses byte-exactly',()=>{const {raw,out,ledger}=fixture();assert(derive(raw,ledger).equals(out));assert.equal(verifyFields(out,ledger,g).good,1);});
 check('R03 frozen raw drift is rejected',()=>{const {raw,ledger}=fixture();raw[0]=0;assert.throws(()=>derive(raw,ledger),/raw drift/);});
 check('R03 frozen ledger tampering is rejected',()=>{const {raw,ledger}=fixture();ledger.edits[0].fieldIndex=0;assert.throws(()=>derive(raw,ledger),/ledger edit digest/);});
 check('R03 frozen field not authorized by rule is rejected',()=>{const {raw,ledger}=fixture();ledger.edits[0].field='DS_CAS';reseal(ledger);assert.throws(()=>derive(raw,ledger));});
 check('R03 frozen ambiguous edit is rejected',()=>{const {raw,ledger}=fixture();ledger.edits[0].candidateCount=2;reseal(ledger);assert.throws(()=>derive(raw,ledger));});
 check('R03 unresolved record blocks frozen review',()=>{const {raw,ledger}=fixture();ledger.unresolved=[{line:2}];assert.throws(()=>derive(raw,ledger),/unresolved records/);});
 check('R03 frozen physical location must match interpreted field',()=>{const {out,ledger}=fixture();ledger.edits[0].startLine=3;ledger.edits[0].endLine=3;assert.throws(()=>verifyFields(out,ledger,g),/missing repair/);});
 check('R03 frozen field digest must be equal, not just width',()=>{const {out,ledger}=fixture();ledger.fieldDigest='0'.repeat(64);assert.throws(()=>verifyFields(out,ledger,g),/digest differs/);});
 check('R03 frozen canonical parser rejects excess fields despite ledger',()=>{const {out,ledger}=fixture();assert.throws(()=>verifyFields(Buffer.concat([out,Buffer.from('a;b;c\n')]),ledger,g),/strict CSV failed/);});
}
if(!fixtureOnly)check('R03 integrated proposal Python to Node dry-run and negative source gates',()=>{const r=require('node:child_process').spawnSync('python3',[path.join(__dirname,'medication-catalog/test-catalog-lexical-proposal-r03.py')],{encoding:'utf8',timeout:30000});assert.equal(r.status,0,(r.stdout||'')+(r.stderr||'')+String(r.error||''));});
// Envelope checks use synthetic source descriptors; no official identity is claimed.
if(!fixtureOnly){
 const {verifyReviewInput,createLabFixture,fixtureSQL}=require('./medication-catalog/catalog-incremental-input-r03.cjs');
 const contract=require('./medication-catalog/catalog-source-contract-r03.json');
 const shaFile=f=>require('node:crypto').createHash('sha256').update(fs.readFileSync(require.resolve(f))).digest('hex');
 const hex='a'.repeat(64);
 function envelopeFixture(){
  const s=snapshot();s.products[0].id='00000000-0000-4000-8000-000000000001';s.substances[0].id='00000000-0000-4000-8000-000000000002';s.substances[1].id='00000000-0000-4000-8000-000000000003';
  const m={project:'gqxqbfkcgfhsqtwjlhvz',status:'DOUBLE_READ_MATCH',transactional:false,sha256:digest(s),counts:Object.fromEntries(Object.keys(TABLES).map(k=>[k,s[k].length]))};
  const sources=Object.entries(contract.sources).map(([name,c])=>({name,url:c.url,effectiveUrl:c.url,status:'DOWNLOADED',sha256:hex,headersSHA256:hex,bytes:1}));
  const b={mode:'UNAPPROVED_LEXICAL_INTERPRETATION',publication:'LOCKED',snapshotManifest:m,schemaVersion:contract.schemaVersion,manifestSHA256:hex,ledgerSHA256:hex,contractSHA256:shaFile('./medication-catalog/catalog-source-contract-r03.json'),parserSHA256:shaFile('./medication-catalog/build-anvisa-canonical-package.js'),originalManifest:{status:'COMPLETE',supplementalStatus:'COMPLETE',sources},sources:sources.filter(x=>contract.sources[x.name].header).map(x=>({name:x.name,rawSHA256:hex,reversedSHA256:hex,overlaySHA256:hex,fieldDigest:hex,editsSHA256:hex}))};
  const p=buildReviewPlan(s,core());return {r:{mode:'DRY_RUN_UNAPPROVED_OVERLAY_REVIEW_ONLY',publication:'LOCKED',productionWrites:0,readyForPublication:false,reviewPlan:p,sourceOverlayBinding:b,sourceOverlayBindingSHA256:digest(b)},e:{snapshot:s,manifest:m}};
 }
 check('R03 envelope remains explicitly unauthorized',()=>{const {r,e}=envelopeFixture();const out=verifyReviewInput(r,e);assert.equal(out.officialVersionAuthorization,null);assert.equal(out.publication,'LOCKED');assert.equal(out.counts.links,2);const f=createLabFixture(r,e,out);assert.equal(f.mode,'ISOLATED_LAB_ONLY');assert.equal(f.version.active,false);assert(fixtureSQL(f).includes('load_fixture'));});
 for(const [name,mutate] of [
  ['publication flag',({r})=>{r.publication='GO'}],['production write',({r})=>{r.productionWrites=1}],['binding seal',({r})=>{r.sourceOverlayBinding.ledgerSHA256='b'.repeat(64)}],['snapshot drift',({e})=>{e.snapshot.products[0].product_name='other'}],['parser drift',({r})=>{r.sourceOverlayBinding.parserSHA256='b'.repeat(64);r.sourceOverlayBindingSHA256=digest(r.sourceOverlayBinding)}],['untrusted URL',({r})=>{r.sourceOverlayBinding.originalManifest.sources[0].effectiveUrl='https://example.com/a';r.sourceOverlayBindingSHA256=digest(r.sourceOverlayBinding)}],['plan edit',({r})=>{r.reviewPlan.groups[0].operations[0].sourceRows=[999]}],['missing witness',({r})=>{r.reviewPlan.groups[0].operations[0].sourceRows=[]}],['blocked code',({r})=>{r.reviewPlan.groups[0].operations[0].row.external_substance_id='25489'}]
 ])check('R03 envelope rejects '+name,()=>{const f=envelopeFixture();mutate(f);assert.throws(()=>verifyReviewInput(f.r,f.e));});
}
(async()=>{for(const [name,fn] of tasks){try{await fn();console.log('PHARMALENS_PASS',name);pass++;}catch(e){console.error('PHARMALENS_FAIL',name,e.message);fail++;}}console.log(`PHARMALENS_PASS=${pass} FAIL=${fail} MODE=${fixtureOnly?'FIXTURE_ONLY':'REAL_IMPORTER'}`);if(fail)process.exitCode=1;})();
