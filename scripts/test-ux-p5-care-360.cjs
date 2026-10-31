#!/usr/bin/env node
const fs=require('node:fs');const assert=require('node:assert/strict');
const home=fs.readFileSync('app/page.tsx','utf8');
const opp=fs.readFileSync('lib/health-intelligence/medication-care-opportunities.ts','utf8');
const queue=fs.readFileSync('components/saude/MedicationCareOpportunityQueue.tsx','utf8');
const med=fs.readFileSync('app/saude/medicamentos/page.tsx','utf8');
const panorama=fs.readFileSync('components/saude/MedicationPortfolioOverview.tsx','utf8');
const care=fs.readFileSync('lib/health-intelligence/medication-care-decision.ts','utf8');
const checks={
  'Home exibe oportunidades adicionais com componente proprio':home.includes('<MedicationCareOpportunityQueue')&&home.includes('medicationCareOpportunities.slice(1)'),
  'Home amplia cobertura sem varredura duplicada':/buildMedicationCareOpportunities\([\s\S]*?limit:\s*8,/.test(home),
  'Home preserva acao primaria real':home.includes('primaryMedicationCareOpportunity.actionHref'),
  'Brain nao repete receita quando decisao canônica pede aquisição':home.includes('primaryCareCommand.href.includes("/nova-receita")')&&home.includes('item.careStage === "acquisition_needed"'),
  'Fila usa identidade farmacêutica verdadeira':queue.includes('<MedicationFormatIcon formato={item.formato} cores={item.cores}'),
  'Fila mantém tratamento e escopo ligado a IDs reais':queue.includes('item.treatmentName')&&queue.includes('item.medicationHref')&&queue.includes('item.actionHref'),
  'Estágios estáveis não viram falsas pendências':opp.includes('if (careDecision.stage === "stable") continue'),
  'Acesso só complementa ação relacional':opp.includes('accessAction?.href ?? careDecision.actionHref'),
  'Receita e aquisição são distintas':opp.includes('isPrescriptionOnly')&&care.includes('isFutureAcquisition'),
  'Filtragem segura por conta e pessoa':opp.includes('event.user_id === medicamento.user_id')&&opp.includes('event.person_id === medicamento.person_id'),
  'Estoque SOS vazio continua acionável':med.includes('(!isEstoqueZerado || isSOS)'),
  'Sete categorias preservadas':med.includes('Mais filtros')&&med.includes('Outras categorias de medicamentos'),
  'Ícones e faixas preservados':med.includes('getMedicamentoIconComponent')&&med.includes('selectedRegulatory'),
  'Contagens do Brain não imitam contagem da listagem':panorama.includes('critérios próprios de acompanhamento'),
  'Nenhuma validade presumida':care.includes('validade atual não inferida'),
};
let fails=0;for(const [name,ok] of Object.entries(checks)){console.log((ok?'OK':'FALHOU')+': '+name);if(!ok)fails++}if(fails)process.exit(1);
