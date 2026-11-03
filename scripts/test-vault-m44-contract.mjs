/** M44: navegação local por intenção, sem escrita clínica. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(import.meta.dirname, '..');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');
let count = 0;
function ok(name, callback) { callback(); count++; console.log(`M44 OK ${count}: ${name}`); }
function load(file, deps = {}) {
  const js = ts.transpileModule(source(file), { compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022} }).outputText;
  const module = {exports:{}};
  new Function('module','exports','require',js)(module,module.exports,name => { if (!(name in deps)) throw Error(`M44 import inesperado ${name} in ${file}`); return deps[name]; });
  return module.exports;
}
const local = load('lib/local-search.ts');
const restock = load('lib/health-intelligence/medication-restock-navigation.ts');
const engine = load('lib/health-intelligence/vault-brain-commands.ts',{
  '@/lib/local-search':local,
  '@/lib/health-intelligence/medication-restock-navigation':restock,
});
const med = {id:'med1',user_id:'usr1',person_id:'p1',nome:'Venvanse',dosagem:'30 mg', document_id:'doc1'};
const med2 = {id:'med2',user_id:'usr1',person_id:'p1',nome:'Venvanse genérico',dosagem:'50 mg'};
const foreign = {id:'foreign',user_id:'usr1',person_id:'p2',nome:'Medicamento secreto',dosagem:'20 mg'};
const otherUser = {id:'other',user_id:'usr2',person_id:'p1',nome:'Medicamento externo',dosagem:'20 mg'};
const dataset = {userId:'usr1',personId:'p1',medications:[med,med2,foreign,otherUser],
  documents:[{id:'doc1',user_id:'usr1',person_id:'p1',title:'Receita anterior',type:'receita',metadata:{}},{id:'doc2',user_id:'usr2',person_id:'p1',title:'Segredo de terceiro',type:'receita'}],
  renewals:[{id:'rx1',user_id:'usr1',person_id:'p1',medicamento_id:'med1',data:'2026-01-01'}, {id:'rx2',user_id:'usr2',person_id:'p1',medicamento_id:'med1',data:'2026-01-01'}],
  treatments:[{id:'t1',user_id:'usr1',person_id:'p1',nome:'Tratamento X'}],
  appointments:[{id:'a1',user_id:'usr1',person_id:'p1',especialidade:'Psiquiatria',medico:'Teste'}],
  exams:[{id:'e1',user_id:'usr1',person_id:'p1',nome:'Hemograma'}]};
const search = q => engine.searchVaultBrainCommands(q,dataset);
ok('Não consulta dados sem conta',()=>assert.equal(engine.searchVaultBrainCommands('venvanse',{...dataset,userId:null}).length,0));
ok('Não consulta dados sem pessoa',()=>assert.equal(engine.searchVaultBrainCommands('venvanse',{...dataset,personId:null}).length,0));
ok('Acesso rápido não altera registros',()=>assert.equal(search('')[0].href,'/hoje'));
ok('Rota de medicamentos reconhecida',()=>assert.equal(search('abrir meus medicamentos')[0].href,'/saude/medicamentos'));
ok('Doses pendentes aplicam parâmetro conhecido',()=>assert.equal(search('mostrar doses pendentes')[0].href,'/hoje?focus=doses&status=pendentes'));
ok('Estoque tem formulário específico e sem escrita automática',()=>assert.ok(search('repor Venvanse').some(x=>x.href.includes('mode=acquisition'))));
ok('Saldo desconhecido aponta para contagem',()=>assert.ok(search('informar saldo de Venvanse').some(x=>x.href.startsWith('/saude/medicamentos/saldo?'))));
ok('Intenção sem medicamento definido não inventa escolha',()=>assert.equal(search('repor estoque')[0].href,'/saude/medicamentos'));
ok('Busca de medicamento sem confundir pessoa',()=>assert.ok(!search('Medicamento secreto').some(x=>x.href.includes('foreign'))));
ok('Busca não inclui dados de outra conta',()=>assert.ok(!search('Medicamento externo').some(x=>x.href.includes('other'))));
ok('Busca de documento de terceiro permanece isolada',()=>assert.ok(!search('Segredo de terceiro').some(x=>x.href.includes('doc2'))));
ok('Receita prioriza vínculo canônico e exclui de terceiros',()=>{const x=search('ver receita de Venvanse'); assert.ok(x.some(x=>x.href.includes('doc1')));assert.ok(x.some(x=>x.href.includes('rx1')));assert.ok(!x.some(x=>x.href.includes('rx2')));});
ok('Receita sem vínculo aponta para revisão, sem inventar documento',()=>assert.ok(search('ver receita de Remédio inexistente').some(x=>x.href==='/saude/renovacao')));
ok('Tratamento concreto navega para detalhe',()=>assert.ok(search('Tratamento X').some(x=>x.href.includes('t1'))));
ok('Consulta concreta navega para detalhe',()=>assert.ok(search('Psiquiatria').some(x=>x.href.includes('a1'))));
ok('Exame concreto navega para detalhe',()=>assert.ok(search('Hemograma').some(x=>x.href.includes('e1'))));
ok('Rota de documentos é permitida',()=>assert.equal(search('abrir documentos')[0].href,'/documentos'));
ok('Documento de saúde abre no módulo clínico',()=>{const docs=[{id:'healthdoc',user_id:'usr1',person_id:'p1',type:'receita',category_id:'saude',title:'Exame saúde'}]; const x=engine.searchVaultBrainCommands('Exame saúde',{...dataset,documents:docs});assert.ok(x.some(x=>x.href==='/saude/documentos/detalhes?id=healthdoc'));});
ok('Documento pessoal usa módulo de documentos geral',()=>{const docs=[{id:'general',user_id:'usr1',person_id:'p1',type:'rg',category_id:'pessoal',title:'Identidade pessoal'}];const x=engine.searchVaultBrainCommands('Identidade pessoal',{...dataset,documents:docs});assert.ok(x.some(x=>x.href==='/documentos/detalhes?id=general'));});
ok('Nenhum destino externo é gerado em comandos comuns',()=>assert.ok(['abrir exames','repor Venvanse','buscar hemograma','http://evil.test'].flatMap(search).every(x=>x.href.startsWith('/')&&!x.href.startsWith('//'))));
const commandSource=source('lib/health-intelligence/vault-brain-commands.ts');
const componentSource=source('components/health-intelligence/VaultBrainCommand.tsx');
const home=source('app/page.tsx');const today=source('app/hoje/page.tsx');
ok('Motor não possui gravações nem rede',()=>{assert.doesNotMatch(commandSource,/(?:db\.|Repository\.)\w+\.(?:put|add|update|delete)\(|fetch\(|axios\.|localStorage|supabase/);});
ok('Componente não tem gravação, voz automática nem histórico persistido',()=>{assert.doesNotMatch(componentSource,/\.put\(|\.add\(|fetch\(|localStorage|SpeechRecognition/);assert.match(componentSource,/aria-modal="true"/);assert.match(componentSource,/createPortal/);});
ok('Única entrada contextual e discreta no cabeçalho',()=>{assert.match(home,/VaultBrainCommand data=/);assert.match(componentSource,/Pesquisar com VAULT Brain/);});
ok('A busca é isolada por usuário e pessoa na origem',()=>{assert.match(commandSource,/owned\(input\.medications/);assert.match(home,/userId: user\?\.id/);assert.match(home,/personId: activePersonId/);});
ok('Deep-link Hoje aplica status sem alterar logs',()=>{assert.match(today,/commandDoseStatus !== "pendentes"/);assert.match(today,/setFiltroStatus\("pendentes"\)/);});
ok('Nenhuma denominação equivocada foi introduzida',()=>assert.doesNotMatch([componentSource,commandSource].join(' '),/f[eê]nix/i));
ok('Sintaxe TS/TSX em todos os arquivos M44',()=>{for(const file of ['lib/health-intelligence/vault-brain-commands.ts','components/health-intelligence/VaultBrainCommand.tsx','app/page.tsx','app/hoje/page.tsx']) {const ast=ts.createSourceFile(file,source(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);assert.equal(ast.parseDiagnostics.length,0,`${file}: ${ast.parseDiagnostics.map(x=>x.messageText).join(',')}`);}});
console.log(`M44: ${count} verificações aprovadas.`);
