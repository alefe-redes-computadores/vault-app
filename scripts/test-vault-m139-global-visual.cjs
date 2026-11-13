#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
let n=0;
function ok(condition,message){assert.ok(condition,'M139: '+message);console.log('✓ M139 '+(++n)+': '+message)}
const read=path=>fs.readFileSync(path,'utf8');
const files=[
  'app/saude/minha-saude/page.tsx',
  'components/saude/AvatarEvidenceLensM122.tsx',
  'components/saude/AvatarMoodEvidence.tsx',
  'components/saude/AvatarCareReadiness.tsx',
  'components/saude/HealthAvatar.tsx',
  'app/saude/medicamentos/historico/page.tsx',
  'components/saude/DoseMonthOverview.tsx',
  'components/saude/SupplyRelationshipMap.tsx',
  'components/home/HomeCommandCenter.tsx',
  'components/home/HomeClinicalAreaTile.tsx',
  'scripts/test-v63-release-gate.mjs',
];
for(const path of files){
  const source=read(path);
  const kind=path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.JS;
  const tree=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,kind);
  const errors=tree.parseDiagnostics.map(d=>{
    const pos=tree.getLineAndCharacterOfPosition(d.start||0);
    return `${pos.line+1}:${pos.character+1}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`;
  });
  ok(errors.length===0,`${path}: sintaxe ${errors.join('; ')}`);
}
const home=read(files[0]);
ok(home.includes('min-h-[100dvh]')&&home.includes('safe-area-inset-bottom')&&home.includes('pt-5 min-[420px]:pt-6')&&!home.includes('safe-area-inset-top')&&!/\bpt-safe\b/.test(home),'Minha Saúde preserva área segura inferior e delega topo ao layout global conforme V31');
ok(home.includes('grid-cols-2 gap-2 self-center min-[420px]:grid-cols-3')&&home.includes('col-span-2 min-[420px]:col-span-1'),'altura, peso e IMC não são espremidos na mesma linha estreita');
ok(home.includes('min-[350px]:grid-cols-3')&&home.includes('Anterior com dados')&&home.includes('Próximo com dados'),'navegação entre dias adapta a tela e preserva rótulos');
ok(home.includes('<HealthBody key={personId}')&&home.includes('<AvatarEvidenceLensM122')&&home.includes('<AvatarCareWorkspace'),'Fênix, lente e Brain permanecem integrados à Minha Saúde');
ok(home.includes('onClick={() => go("/")}')&&home.includes('onClick={() => go("/saude/lembretes")}'),'voltar e configurações continuam navegáveis');
const lens=read(files[1]);
ok(lens.includes('const expanded=opened&&activeDomain===domain.id')&&lens.includes('expanded ? "min-[380px]:col-span-2"')&&lens.includes('min-[380px]:grid-cols-2'),'uma evidência expandida usa a largura disponível, sem desaparecer outra área');
ok(lens.includes('onNavigate(entry.href)')&&lens.includes('onExplain(insight)')&&lens.includes('onNavigate(domain.route)'),'links de evidências continuam ligados à origem real');
ok(lens.includes('opened?buildAvatarEvidenceLensM122')&&lens.includes('evidenceReceiptM119(insight)'),'lente continua sob demanda e mantém autoridades do Brain');
ok(lens.includes('min-h-10 min-[350px]:min-h-11')&&lens.includes('aria-pressed={period===days}'),'janela 7/30 dias mantém teste legado e alvo maior no Android');
const mood=read(files[2]);
ok(mood.includes('evidence.reason')&&mood.includes('coverageDays')&&mood.includes('Dias sem registro continuam desconhecidos'),'expressão não infere humor nem altera cobertura');
ok(mood.includes('text-[11px] leading-relaxed text-ink-muted')&&mood.includes('Resumo para consulta'),'explicação da Fênix permanece legível');
const readiness=read(files[3]);
ok(readiness.includes('buildAvatarDecisionBrief')&&readiness.includes('avatarCarePosture')&&readiness.includes('onNavigate(destination)'),'decisão canônica do Brain e destino mantidos');
ok(readiness.includes('block line-clamp-1 break-words text-[11px] font-medium text-violet-200 min-[350px]:line-clamp-2'),'CTA da Fênix tem texto responsivo e preserva V257/P12: resumo compacto');
ok(readiness.includes('buildCareForecast')&&readiness.includes('nextAction.title')&&readiness.includes('line-clamp-1'),'V257 histórico: previsão do Brain permanece legível e compacta');

const avatar=read(files[4]);
ok(avatar.includes('grid-cols-1 gap-1.5 min-[350px]:grid-cols-3')&&avatar.includes('chooseMode(\'3d\')')&&avatar.includes('chooseMode(\'illustration\')'),'controles Avatar 3D, ilustração e ampliar não disputam coluna auto');
ok(avatar.includes('canMountAvatar3D')&&avatar.includes('Avatar3DBoundary')&&avatar.includes('onUnavailable={fallback}'),'fallback Android/WebGL conservado, sem novo renderer');
const history=read(files[5]);
ok(history.includes('Resumo do mês selecionado')&&history.includes('Eventos e unidades do dia selecionado')&&history.includes('monthlyDaysUnconfirmed'),'dia, mês e ausência de confirmação continuam separados');
ok(history.includes('aria-pressed={selected}')&&history.includes('aria-current={day.date === today ? "date" : undefined}'),'calendário anuncia seleção e dia atual');
ok(history.includes('h-11 w-11')&&history.includes('min-h-11 shrink-0')&&history.includes('focus-visible:outline'),'setas e revisão com alvo de toque e foco acessível');
ok(!history.includes('text-[8px]')&&!history.includes('text-[9px]'),'histórico mensal sem textos de 8-9 px');
ok(history.includes('retro=1&medicamento=')&&history.includes('Registro ausente não comprova dose não tomada'),'revisão retroativa e semântica clínica não removidas');
const month=read(files[6]);
ok(month.includes('useLiveQuery(async()=>')&&month.includes('db.doseLogs.where("[user_id+person_id+data]")'),'histórico sob demanda preserva consulta escopada por conta/pessoa/data');
ok(month.includes('grid-cols-2 gap-2 text-center min-[420px]:grid-cols-3')&&month.includes('col-span-2 min-[420px]:col-span-1'),'contadores de 7/30/90 dias cabem em tela estreita');
ok(month.includes('>{n} dias</button>')&&month.includes('aria-current={day.date === today ? "date" : undefined}'),'período explícito e destaque acessível do dia atual');
ok(month.includes('Dias sem registros não são classificados como falhas'),'não inventa falha/adesão clínica');
const supply=read(files[7]);
ok(supply.includes('min-h-11 min-w-0 items-center break-words')&&supply.includes('href={`/saude/documentos/detalhes')&&supply.includes('href={`/saude/retiradas/detalhes'),'documentos e retiradas têm alvo tátil com navegação real');
ok(!supply.includes('text-[9px]')&&!supply.includes('text-[10px]'),'mapa do fornecimento sem rótulos microscópicos');
ok(supply.includes('value.process.origin')&&supply.includes('value.cycles.total')&&supply.includes('value.withdrawals.length'),'mapa preserva fatos independentes sem recomputação');
const center=read(files[8]),tile=read(files[9]);
ok(center.includes('grid min-w-0 grid-cols-2 gap-2 items-stretch max-[349px]:grid-cols-1')&&center.includes('rounded-[18px] border border-emerald-400/20'),'Home preserva M136 com adaptação da primeira dobra em 320px');
ok(center.includes('rounded-[18px] border border-emerald-400/20 bg-surface px-2.5 py-2.5 text-left touch-manipulation shadow-sm'),'Home R3 mantém o raio e a borda originais com toque adicional sem quebrar contratos P15');
ok(center.includes('go("/saude/medicamentos")')&&center.includes('path="/saude/minha-saude"'),'atalhos primários continuam apontando para suas páginas reais');
ok(tile.includes('min-h-[84px]')&&tile.includes('${tone}')&&tile.includes('touch-manipulation')&&tile.includes('onNavigate(path)'),'cartões preservam altura, tema, toques e destinos');
ok(center.includes('grid min-w-0 grid-cols-2 gap-2')&&center.includes('grid-cols-2 gap-2 items-stretch'), 'contratos legados P15 R9 R6, V196, M131 e M136 da Home continuam validos');
const harmony=read('scripts/test-vault-home-harmony.cjs');
ok(harmony.includes('useState: initial =>')&&harmony.includes('useEffect: () => {}'), 'harness Home Harmony simula hooks React reais sem efeitos colaterais');
ok(harmony.includes("tile.props.className.includes('bg-violet-400/[0.06]')")&&harmony.includes("tile.props.className.includes('border-violet-400/20')"), 'Home Harmony testa paleta M132, não expectativa obsoleta');
const gate=read(files[10]);
ok(gate.includes('"scripts/test-vault-m138-visual-identity.cjs"')&&gate.includes('"scripts/test-vault-m139-global-visual.cjs"')&&gate.includes('"scripts/test-vault-home-harmony.cjs"'),'gate global inclui M138 e M139');
ok(gate.includes('"scripts/test-vault-m137-temporary-course-integrity.cjs"')&&gate.includes('"scripts/test-vault-m136-visual-navigation.cjs"'),'gate não descarta integridade e navegação anteriores');
console.log(`M139 VISUAL GLOBAL: ${n} verificações direcionadas aprovadas.`);
