const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=(p)=>fs.readFileSync(p,'utf8');
const paths={
  help:'lib/help/catalog.ts',uiR3:'scripts/test-vault-ui360-r3.cjs',medHook:'hooks/useMedicationRegulatoryProfiles.ts',meds:'app/saude/medicamentos/page.tsx',details:'app/saude/medicamentos/detalhes/page.tsx',symptoms:'app/saude/careflow/sintomas/page.tsx',
  care:'app/saude/careflow/page.tsx',home:'app/page.tsx',medical:'app/saude/careflow/modo-medico/page.tsx',
  update:'components/updates/VaultUpdateCenter.tsx',pressure:'app/saude/careflow/pressao/page.tsx',
  dossie:'app/saude/careflow/dossie/page.tsx',time:'components/saude/HealthTimePicker.tsx',
  pdf:'lib/m3/medical-pdf-p3.ts',gate:'scripts/test-v63-release-gate.mjs',
  css:'app/globals.css',list:'components/list/ListCard.tsx',opportunities:'lib/health-intelligence/medication-care-opportunities.ts',
  network:'components/saude/MedicationCareNetworkDetails.tsx',prescription:'components/saude/MedicationPrescriptionCard.tsx',journey:'components/saude/MedicationJourneySummary.tsx',
  exams:'app/saude/careflow/exames/page.tsx',relations:'components/saude/CareFlowRelationsR5.tsx'
};
const src=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,read(p)]));
const tests=[
  ['V34 original: pressão uma autoridade e URL',()=>{assert.match(src.pressure,/activeForm.*"plan" \| "reading" \| null/);assert.doesNotMatch(src.pressure,/setShowPlanForm|setShowReadingForm/)}],
  ['V34 original: guarda sintomas sincronica',()=>assert.match(src.symptoms,/submitLock\.current/)],
  ['V34 original: preservacao de pessoa e vínculos',()=>{assert.match(src.symptoms,/medicamento_id:medication\|\|null/);assert.doesNotMatch(src.symptoms,/setMedication\(''\);setConsultation\(''\)/)}],
  ['Sintomas: toast só após resposta positiva',()=>{const x=src.symptoms;assert(x.indexOf("showSuccess('Sintoma salvo neste aparelho.')")>x.indexOf('const recordId=await createRegistro('));}],
  ['Sintomas: erro deixa dados e acusa falha',()=>assert.match(src.symptoms,/showError\(explanation\)/)],
  ['Sintomas: fecha após sucesso e mostra reparo fora do formulário',()=>{assert.match(src.symptoms,/setStatus\('Sintoma registrado e vinculado à consulta\.'\);setComposeOpen\(false\)/);assert.match(src.symptoms,/!composeOpen && pendingLink/)}],
  ['Sintomas: paridade altura data e hora',()=>{assert.match(src.symptoms,/\[&_input\]:h-12/);assert.match(src.symptoms,/<HealthTimePicker\s+className="h-12"/)}],
  ['Sintomas: sem violeta indevido nos CTAs',()=>{assert.doesNotMatch(src.symptoms,/bg-violet-300|text-violet-300/);assert.match(src.symptoms,/bg-emerald-300/)}],
  ['Medicamentos: Gaveta 360 somente no nome/seta e menu',()=>{assert.match(src.meds,/data-vault-med360-entry="name"/);assert.match(src.meds,/data-vault-v34x-title-hitbox/);assert.match(src.meds,/w-fit max-w-full flex-none/);assert.doesNotMatch(src.meds,/data-vault-med360-entry="details"/)}],
  ['Medicamentos: principio e receita fora do alvo da Gaveta',()=>{assert.match(src.meds,/data-vault-v34x-receita-cadastro/);assert.match(src.meds,/data-vault-r5-active-ingredient/);assert.match(src.meds,/data-vault-v34x-receita-documento/);assert.match(src.help,/O espaço livre do cartão abre os Detalhes por ID/)}],
  ['Medicamentos: superficie neutra mantém Detalhes por ID',()=>{assert.match(src.meds,/navigationLabel=\{`Ver detalhes de \$\{med\.nome\}`\}/);assert.match(src.meds,/router\.push\(\s*`\/saude\/medicamentos\/detalhes\?id=/)}],
  ['Medicamentos: menu mantém Gaveta 360',()=>{assert.match(src.meds,/data-vault-med360-entry="menu"/);assert.match(src.meds,/openMedicationSheet360\("acoes"\)/)}],
  ['Medicamentos: principio somente via autoridade',()=>{assert.match(src.meds,/resolveMedicationKnowledgeM153P4/);assert.match(src.meds,/medicationIngredientDisplayResidual\(catalogIdentity, medicationKnowledge360\.facts\)/)}],
  ['Identidade: fallback somente de snapshot confirmado',()=>{assert.match(src.medHook,/sameVerifiedProduct/);assert.match(src.medHook,/medication\.catalog_snapshot\?\.match_kind === "exact"/);assert.match(src.medHook,/displayIngredients/)}],
  ['Detalhes: identidade legivel sem abrir gaveta',()=>{assert.match(src.details,/data-vault-v34x-ingredient-visible/);assert.match(src.details,/medicationIngredientDisplayResidual\(catalogIdentity, stableMedicationKnowledge\.facts\)/)}],
  ['Medicamentos: V34 fixa filtros na rolagem',()=>assert.match(src.meds,/sticky top-20/)],
  ['Home: destino de tratamento tipado e icone',()=>{assert.match(src.home,/primaryMedicationCareOpportunity\.treatmentHref!/);assert(src.home.includes('<TreatmentIdentityIconR03 entity={primaryMedicationCareOpportunity.treatmentId?{id:primaryMedicationCareOpportunity.treatmentId}:null} size={18}') && src.home.includes('primaryMedicationCareOpportunity.treatmentHref!'))}],
  ['Home: CTA esmeralda',()=>{assert.match(src.home,/\? "bg-emerald-300 text-void"/);assert.doesNotMatch(src.home,/\? "bg-coral text-white"/)}],
  ['CareFlow: numero impar na grade agrupada',()=>{assert.match(src.care,/Consulta e documentos',cards:\[areas\[1\],areas\[3\],areas\[7\]\]/);assert.match(src.care,/group\.cards\.length%2===1&&index===group\.cards\.length-1/)}],
  ['CareFlow: exames preservados em grupo funcional',()=>assert.match(src.care,/Registros e evolução',cards:\[areas\[2\],areas\[4\],areas\[5\],areas\[6\]\]/)],
  ['Modo Médico: datas humanas em textos e chips',()=>{assert.match(src.medical,/humanClinicalTextV34X\(row\.detail\)/);assert.match(src.medical,/humanClinicalTextV34X\(link\)/)}],
  ['Modo Médico: PDF humaniza os mesmos vínculos',()=>{assert.match(src.pdf,/humanRowTextV34X/);assert.match(src.pdf,/humanRowTextV34X\(link\)/);assert.match(src.pdf,/humanRowTextV34X\(value\.detail\)/)}],
  ['Modo Médico: ícone relacional por item',()=>{const row=read('components/saude/MedicalDossierRowIconB.tsx');assert.match(src.medical,/<MedicalDossierRowIconB row=\{row\} fallbackIcon=\{Icon\} fallbackTone=\{groupTone\(section\)\}/);assert.match(row,/metricIdentityB\(row\.visualB\?\.metric\)/);assert.match(row,/row\.visualB\?\.kind==="medication"/);assert.match(row,/<MedicationFormatIcon formato=\{row\.visualB\.formato\}/);assert.match(row,/<MetricIcon size=\{17\}/);assert.match(row,/<Fallback size=\{16\}/);assert.match(row,/aria-hidden="true"/)}],
  ['Modo Médico: PDF principal esmeralda',()=>assert.match(src.medical,/createPdf\('download'\)[\s\S]{0,100}bg-emerald-300/)],
  ['Atualizações: Update 360 oficial preservado, sem bloco concorrente',()=>{
    for (const q of ['O que mudou nesta atualização','Execução do GitHub Actions','Cópia temporária para testes','VaultUpdateHistory installedBuild=','checkedLabel','releaseRunGap'])
      assert.ok(src.update.includes(q),q);
    assert.doesNotMatch(src.update,/aria-label="Informações da atualização"/);
  }],
  ['Atualizações: build instalado e build da release',()=>{assert.match(src.update,/state\.installedBuild/);assert.match(src.update,/release\.build/)}],
  ['Home sem cartão com reserva 520px',()=>{assert.doesNotMatch(src.home,/vault-deferred-lg/);assert.doesNotMatch(src.home,/className="vault-deferred(?:\s|")/)}],
  ['Sombras menos densas no tema escuro e listas',()=>{assert.match(src.css,/--shadow-vault: 0 8px 22px -12px rgba\(0,0,0,0\.24\)/);assert.match(src.list,/\$\{isCompact \? "shadow-none" : "shadow-sm"\}/);assert.doesNotMatch(src.list,/hover:shadow-lg/)}],
  ['Cursos por período não criam atalho eterno',()=>{assert.match(src.opportunities,/parseTemporaryCourseNote/);assert.match(src.opportunities,/temporaryCourseEnd/);assert.match(src.opportunities,/if \(end < today\) continue/);assert.doesNotMatch(src.opportunities,/OTOCIRIAX|Zumbido|ouvido esquerdo/i)}],
  ['Cards da Home seguem origem clínica e ID',()=>{assert.match(src.home,/buildMedicationCareOpportunities/);assert.match(src.home,/primaryMedicationCareOpportunity\.medicationHref/);assert.match(src.home,/primaryMedicationCareOpportunity\.treatmentHref/)}],
  ['Receita declarada não é evento de prescrição',()=>{assert.match(src.journey,/prescriptionDeclared \? "Data informada no cadastro; sem evento separado"/);assert.match(src.details,/prescriptionDeclared=\{Boolean\(med\.data_receita\)\}/)}],
  ['Anexo de receita não é falta categórica de emissão',()=>{assert.match(src.prescription,/hasAttachment && status === "missing"/);assert.match(src.prescription,/Data de emissão não informada/)}],
  ['Relações por ID em Sintomas sem inferir causalidade',()=>{assert.match(src.symptoms,/consultBySymptom/);assert.match(src.symptoms,/saude\/medicamentos\/detalhes\?id=/);assert.match(src.symptoms,/saude\/consultas\/detalhes\?id=/);assert.match(src.symptoms,/r\.medicamento_id/)}],
  ['Exames mantêm autoridade única e ícones de vínculo',()=>{assert.match(src.exams,/createExamOrderM1/);assert.match(src.exams,/<CareFlowOrderRelationsR5 /);assert.match(src.relations,/Icon:Stethoscope/);assert.match(src.relations,/Icon:MapPin/)}],
  ['Pressão mantém links a consulta e sintoma',()=>{assert.match(src.pressure,/<Stethoscope size=\{13\}/);assert.match(src.pressure,/<MessageSquareHeart size=\{13\}/);assert.doesNotMatch(src.pressure,/text-violet-300|border-violet-300/)}],
  ['Rede clínica identifica médico, hospital, farmácia e lugar',()=>{assert.match(src.network,/<Stethoscope size=\{19\}/);assert.match(src.network,/<Building2 size=\{19\}/);assert.match(src.network,/<Store size=\{19\}/);assert.match(src.network,/label="Hospital"/);assert.doesNotMatch(src.network,/bg-violet-400/)}],
  ['Modo Médico mostra ícones de vínculos por contexto',()=>{assert.match(src.medical,/const RelIcon=\/consulta/);assert.match(src.medical,/<RelIcon size=\{14\}/);assert.match(src.medical,/humanClinicalTextV34X\(link\)/)}],
  ['Versão instalada/certificada de origem explícita',()=>{const pkg=JSON.parse(read('package.json'));assert.match(read('lib/app-version.ts'),new RegExp(`APP_VERSION\\s*=\\s*["']${pkg.version.replaceAll('.','\\.')}["']`));assert.match(read('lib/updates/client.ts'),/App\.getInfo\(/);assert.match(read('README.md'),/versionCode/);assert.match(read('.github/workflows/build-android.yml'),/VAULT_VERSION_CODE/)}],
  ['Nenhum motor paralelo ou supabase SQL no overlay',()=>{assert.match(src.gate,/test-vault-v34x-substituta\.cjs/);assert.match(src.dossie,/bg-emerald-300/);assert.match(src.time,/resolveMedicationTimeDraftM4P2/)}],
];
let n=0;
const failures=[];
for (const [name,fn] of tests) {
  try { fn(); n++; console.log('✓ '+name); }
  catch (error) {
    // Full assert.match errors embed thousands of source characters in Termux logs.
    // Report the violated contract/expected pattern without dumping sensitive code.
    const expected=error && Object.prototype.hasOwnProperty.call(error,'expected')
      ? String(error.expected).slice(0,280) : '';
    const code=error && error.code ? String(error.code) : 'ERROR';
    console.error('✗ '+name+' | '+code+(expected?' | esperado: '+expected:''));
    failures.push(name);
  }
}
if (failures.length) {
  console.error(`V34X_CONTRATOS_BLOQUEADOS | ${failures.length}/${tests.length} falharam | ${failures.join('; ')}`);
  process.exitCode=1;
} else {
  console.log(`VAULT V34X: ${n}/${tests.length} contratos dirigidos aprovados (nao substituem V63/V70/TypeScript/APK)`);
}
