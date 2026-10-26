const fs=require('fs'),assert=require('assert'),r=p=>fs.readFileSync(p,'utf8');
const plan=r('lib/health-intelligence/care-plan.ts');
const memory=r('lib/health-intelligence/care-plan-memory.ts');
const card=r('components/health-intelligence/BrainCarePlan.tsx');
const avatar=r('components/saude/AvatarCareReadiness.tsx');
const report=r('app/saude/registros/relatorio/page.tsx');

assert(plan.includes('medicationSupplyRoute')&&plan.includes('supplyRoute'),'plano identifica a origem real do medicamento');
assert(plan.includes('const ranked')&&plan.includes('medication:${item.medicationId}')&&plan.includes('relatedCount: primary.relatedCount + item.relatedCount'),'uma posição executiva por medicamento preserva etapas relacionadas');
assert(plan.includes('dueDate: action.date')&&plan.includes('nextConsultation.data'),'datas operacionais e consulta entram no plano');
assert(plan.includes('formatBrainCarePlan')&&plan.includes('não confirma diagnóstico, prescrição, aquisição, retirada ou adesão'),'exportação do plano preserva limites clínicos');
assert(memory.includes('item.dueDate || ""')&&memory.includes('item.supplyRoute || ""')&&memory.includes('item.relatedCount'),'memória percebe mudança de prazo, origem e composição');
assert(card.includes('expanded ? plan.items : plan.focus')&&card.includes('Ver plano completo'),'card compacto permite abrir plano completo');
assert(card.includes('item.supplyRoute')&&card.includes('item.relatedCount > 1'),'card explica origem e etapas consolidadas');
assert(avatar.indexOf('useEffect(() =>') < avatar.indexOf('if (!portfolio'),'Avatar mantém ordem estável dos hooks');
assert(avatar.includes('planFocus?.supplyRoute'),'Avatar mostra contexto da rota sem poluir o personagem');
assert(report.includes('formatBrainCarePlan(plan)')&&report.includes('currentPlan'),'resumo de consulta inclui o plano atual');
assert(/BRAIN_VERSION = "6\.(?:9|10)"/.test(r('lib/health-intelligence/version.ts')),'Brain preserva 6.9 ou evolução compatível');
console.log('VAULT V269 — PLANO EXECUTIVO + ROTAS + AVATAR ESTÁVEL: OK');
