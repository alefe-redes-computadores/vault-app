#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=f=>fs.readFileSync(f,'utf8');
let n=0;
const ok=(condition,label)=>{assert.ok(condition,`M140: ${label}`);console.log(`✓ M140 ${++n}: ${label}`)};
const paths=[
  'lib/health-supply/operational-snapshot-m140.ts',
  'components/saude/SupplyOperationalCommandM140.tsx',
  'components/saude/SupplyCycleSummary.tsx',
  'app/saude/fornecimento/page.tsx',
];
for(const path of paths){
 const parsed=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(!parsed.parseDiagnostics.length,`TS/TSX válido ${path}: ${parsed.parseDiagnostics.map(x=>x.messageText).join('; ')}`);
}
const src=read(paths[0]),view=read(paths[1]),summary=read(paths[2]),page=read(paths[3]);
const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
ok(!js.diagnostics?.length,'módulo de projeção compila sem diagnóstico de transpile');
const resultModule={exports:{}};
const validSupplyDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));
new Function('module','exports','require',js.outputText)(resultModule,resultModule.exports,id=>{
 if(id==='./rules')return {validSupplyDate};
 throw Error('M140: import runtime inesperado: '+id);
});
const {supplyOperationalSnapshotM140}=resultModule.exports;
const pid='p1',uid='u1',mk=(id,med,date,status,more={})=>({id,user_id:uid,person_id:pid,medicamento_id:med,data:date,status,tipo:'sus',...more});
const process={id:'s1',user_id:uid,person_id:pid,status:'ativo',origem:'estadual_ceaf',titulo:'Metadona',created_at:'2026-09-01',updated_at:'2026-09-01'};
const cycle={id:'c1',processo_id:'s1',user_id:uid,person_id:pid,status:'encerrado',inicio:'2026-10-01',fim:'2026-10-31',created_at:'2026-10-01'};
const second={...process,id:'s2',titulo:'Outro'};
const data={processos:[process],ciclos:[cycle],itens:[{id:'i1',processo_id:'s1',ciclo_id:'c1',medicamento_id:'m1',user_id:uid,person_id:pid}],documentos:[{id:'l1',processo_id:'s1',ciclo_id:'c1',document_id:'d1',user_id:uid,person_id:pid}]};
const document={id:'d1',user_id:uid,person_id:pid,category_id:'saude',title:'LME cadastrada',entidade_tipo:'medicamento',entidade_id:'m1',metadata:{},attachments:[{}]};
const otherDoc={...document,id:'d2',title:'Receita do acervo',entidade_id:'m1'};
const wrongDoc={...document,id:'d3',user_id:'u2'};
const unrelatedDoc={...document,id:'d4',entidade_id:'m2'};
const direct=mk('r1','m1','2026-11-10','realizada',{fornecimento_id:'s1',fornecimento_ciclo_id:'c1'});
const unlinked=mk('r2','m1','2026-11-11','realizada');
const otherProcess=mk('r3','m1','2026-11-12','realizada',{fornecimento_id:'s2',fornecimento_ciclo_id:'c2'});
const otherOwner=mk('r4','m1','2026-11-12','realizada',{user_id:'u2'});
const privatePurchase=mk('r5','m1','2026-11-12','realizada',{tipo:'farmacia'});
const blockedCycle={...cycle,id:'c2',status:'preparando',created_at:'2026-11-11'};
const args={process,cycle,data,documents:[document,otherDoc,wrongDoc,unrelatedDoc],withdrawals:[direct,unlinked,otherProcess,otherOwner,privatePurchase],personId:pid};
const snapshot=supplyOperationalSnapshotM140(args);
ok(snapshot&&snapshot.lastRealized?.id==='r1'&&snapshot.realizedCount===1,'retirada realizada só entra como concluída no painel após vínculo real');
ok(snapshot.unlinkedWithdrawals.length===1&&snapshot.unlinkedWithdrawals[0].id==='r2','retirada cadastrada sem vínculo é descoberta sem duplicar registro');
ok(snapshot.unlinkedWithdrawals.every(x=>x.id!=='r3'&&x.id!=='r4'&&x.id!=='r5'),'não mistura outro processo, outra conta ou compra particular');
ok(snapshot.selectedCycle?.status==='encerrado'&&snapshot.canPrepareCycle,'ciclo encerrado permanece explícito; planejamento só pode começar sem pendência');
ok(snapshot.availableDocuments===3&&snapshot.relatedDocumentCount===2&&snapshot.cycleDocuments===1,'acervo existente e vínculo no ciclo não são confundidos');
ok(snapshot.linkedDocumentsAvailable===1&&snapshot.hasUnlinkedDocuments,'documento real existente não é automaticamente vinculado');
ok(!supplyOperationalSnapshotM140({...args,personId:'p2'}),'bloqueia leitura cruzada de pessoas');
ok(!supplyOperationalSnapshotM140({...args,data:{...data,processos:[second]}}),'bloqueia processo não pertencente ao grafo');
const pending=supplyOperationalSnapshotM140({...args,data:{...data,ciclos:[cycle,blockedCycle]}});
ok(pending.pendingCycle?.id==='c2'&&!pending.canPrepareCycle,'bloqueia proposta duplicada com ciclo preparando');
const archived=supplyOperationalSnapshotM140({...args,process:{...process,status:'encerrado'},data:{...data,processos:[{...process,status:'encerrado'}]}});
ok(archived.processStatus==='encerrado'&&!archived.canPrepareCycle&&archived.realizedCount===1,'arquivamento preserva histórico e bloqueia novo ciclo');
const noLink=supplyOperationalSnapshotM140({...args,withdrawals:[unlinked,privatePurchase]});
ok(!noLink.lastRealized&&noLink.unlinkedWithdrawals.length===1,'não inventa conclusão quando só existe retirada sem vínculo');
const scheduled=supplyOperationalSnapshotM140({...args,withdrawals:[mk('bad','m1','invalid','agendada',{fornecimento_id:'s1'}),mk('good','m1','2026-12-05','agendada',{fornecimento_id:'s1'})]});
ok(scheduled.nextScheduled?.id==='good'&&!scheduled.lastRealized,'data inválida não entra como próximo agendamento nem execução');
const purchased={...process,origem:'comprado'};
const privateView=supplyOperationalSnapshotM140({...args,process:purchased,data:{...data,processos:[purchased]}});
ok(privateView.unlinkedWithdrawals.length===0&&!privateView.canPrepareCycle,'compra particular não recebe ação SUS de retirada ou novo ciclo');
ok(!/\b(fetch\(|supabase|indexedDB|\.put\(|\.add\(|\.delete\(|\.update\(|setTimeout\(|setInterval\()/.test(src),'projeção sem rede, mutação nem temporizador');
ok(!view.includes('repo.')&&!view.includes('fetch(')&&view.includes('onReviewWithdrawal')&&view.includes('onOpenDocuments')&&view.includes('onOpenCycle'),'componente apenas apresenta e delega ações');
ok(view.includes('Nenhuma vinculada')&&view.includes('Retirada realizada')&&view.includes('sem vínculo')&&view.includes('Ciclo encerrado no histórico'),'estado claro não confunde retirada, ciclo e vínculo');
ok(page.includes('<SupplyOperationalCommandM140 snapshot={snapshotM140}')&&page.includes('supplyOperationalSnapshotM140({process,cycle,data,documents,withdrawals:retiradas,personId})'),'comando montado com registros canônicos reais');
ok(page.includes('already ? "Já vinculado neste ciclo"')&&page.includes('No acervo, ainda não vinculado neste ciclo')&&page.includes('supply-link-existing-m140-'),'arquivo existente reaproveitável com estado explícito');
ok(page.includes('links.some(l => l.document_id === docId && l.tipo === kind')&&page.includes('Vínculo já registrado'),'botão impede vínculo repetido na apresentação');
ok(page.includes('Retirada registrada. Preparar o próximo ciclo?')&&page.includes('id="supply-next-cycle-m136"')&&page.includes('Estado e próxima providência do fornecimento'),'M136 preservado sem amputar contratos históricos');
ok(page.includes('compatibleCycleWithdrawals(')&&page.includes('repo.linkDocument(')&&page.includes('repo.newCycle('),'ações canônicas preservadas com confirmação');
ok(summary.includes('availableHealthDocuments')&&summary.includes('conferir vínculo deste ciclo'),'resumo reconhece documentos existentes sem tratá-los como vinculados');
// M140 R2: o V289 de 2024 exige a antiga prop `badge:renovacoes.length`.
// A M139 publicada usa o componente de navegação com contador explícito.
// Preservar contador e entrada canônica, sem voltar ao código legado.
const medicationDetails=read('app/saude/medicamentos/detalhes/page.tsx');
ok(medicationDetails.includes('historyCount={renovacoes.length}')&&medicationDetails.includes('<MedicationDetailNavigation')&&medicationDetails.includes('<HealthSupplyEntry medicamentoId={med.id!}/>'),
  'contador real e entrada canônica de fornecimento preservados na navegação atual');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('"scripts/test-vault-m140-supply.cjs"')&&gate.includes('"scripts/test-vault-m139-global-visual.cjs"'),'M139 e M140 integrados ao gate global');
console.log(`VAULT M140: ${n} verificações da jornada do fornecimento aprovadas.`);
