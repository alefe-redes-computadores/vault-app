const fs=require('fs'); const assert=require('node:assert/strict');
function read(p){return fs.readFileSync(p,'utf8');}
const home=read('app/page.tsx'),hero=read('components/home/HomeDailyHero.tsx');
const meds=read('app/saude/medicamentos/page.tsx'),more=read('app/mais/page.tsx');
const alerts=read('lib/health-insights.ts'),quantity=read('components/home/HomeDoseQuantityFollowUp.tsx');
assert(hero.includes('Resumo unificado da rotina')&&!hero.includes('Entender o contador da rotina')&&!hero.includes('Ver doses e horários'));
assert(home.includes('indicators={<HomeQuickMetrics')&&!home.includes('id="home-resumo-da-rotina"'));
assert(home.includes('HomeAttentionRail alerts={unifiedAlerts}')&&!home.includes('mostrarTodasRetiradas'));
assert(alerts.includes('item.dias !==\n                    null')&&!alerts.includes('item.dias >=\n                    0'));
assert(alerts.includes('retirada.person_id === medicamento.person_id'));
assert(alerts.includes('diasRetirada < 0')&&alerts.includes('Math.abs(diasRetirada)'));
assert(meds.includes('data-vault-filters-collapsed-p7')&&meds.includes('@vault:meds_density_v1'));
assert(meds.includes('Por período')&&meds.includes('Regime de uso cadastrado'));
assert(meds.includes('exactClosedWithdrawalP7')&&meds.includes('activeScheduledWithdrawalP5P4'));
assert(!meds.includes('max-h-6 overflow-hidden')&&!meds.includes('writingMode: "vertical-rl"'));
assert(!meds.includes('Organização e indicadores')&&meds.includes('Próximas doses de hoje'));
assert(more.includes('Ferramentas do cofre pessoal')&&more.includes('group-open:rotate-180'));
assert(quantity.includes('Ações principais do acompanhamento')&&quantity.includes('Plano de segurança e apoio'));
// P7 FIX9: a Agenda so recebe retiradas abertas e a deduplicacao usa o mesmo ID.
const ts=require('typescript'),Module=require('module');
function pure(file){const js=ts.transpileModule(read(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const mod=new Module(file,module);mod._compile(js,file);return mod.exports;}
const {openWithdrawalsDueBy}=pure('lib/withdrawal-agenda.ts');
const {homeAdministrativeWithdrawalAlertsP5P4}=pure('lib/home/home-withdrawal-single-surface-p5-p4.ts');
const pending={id:'w1',status:'agendada',data:'2026-11-14',user_id:'u',person_id:'p',medicamento_id:'m'};
const visible=openWithdrawalsDueBy([pending,{...pending,id:'w2',renovacao_realizada_id:'receipt'},{...pending,id:'w3',realizada_em:'2026-11-14T12:00:00'}], '2026-11-15');
assert.deepEqual(visible.map(x=>x.id),['w1']);
const alertsToDedup=[{id:'sus-retirada-w1',kind:'sus',level:'atencao',href:'/saude/retiradas/detalhes?id=w1'},
{id:'critico-separado',kind:'estoque',level:'urgente',href:'/saude/retiradas/detalhes?id=w1'},
{id:'sus-retirada-w9',kind:'sus',level:'vencido',href:'/saude/retiradas/detalhes?id=w9'}];
assert.deepEqual(homeAdministrativeWithdrawalAlertsP5P4(alertsToDedup,visible).map(x=>x.id),['critico-separado','sus-retirada-w9']);
assert(home.includes('retiradasAgendaM147.slice(0, 1).map(renderRetiradaAgendaP7)'));
assert(home.includes('retiradasAgendaM147.slice(1).map(renderRetiradaAgendaP7)'));
assert(home.includes('homeAdministrativeWithdrawalAlertsP5P4('));
assert(read('hooks/useRetiradas.ts').includes('retiradasRepository.getAll(user.id, activePersonId)'));
console.log('M153 P7 BUILD 2117: contratos visuais + retirada unica + isolamento OK');
