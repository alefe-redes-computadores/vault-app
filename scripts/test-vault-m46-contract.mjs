/** VAULT M46: voz opt-in, busca fluida, isolamento e regressões de apresentação. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(import.meta.dirname, '..');
const src = name => fs.readFileSync(path.join(root, name), 'utf8');
let tests = 0;
function check(name, fn) { fn(); console.log(`M46 OK ${++tests}: ${name}`); }
const moduleFile = 'lib/health-intelligence/voice-recognition.ts';
const voiceFile = 'components/health-intelligence/VaultBrainVoiceInput.tsx';
const commandFile = 'components/health-intelligence/VaultBrainCommand.tsx';
const insightFile = 'components/vault-intelligence/ContextualHealthIntelligence.tsx';
const helperJs = ts.transpileModule(src(moduleFile), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }}).outputText;
const voiceModule = { exports: {} };
new Function('module', 'exports', helperJs)(voiceModule, voiceModule.exports);
const util = voiceModule.exports;
class FakeSpeech { start(){} abort(){} }
check('Sem navegador não oferece voz',()=>assert.equal(util.getVaultSpeechConstructor(null),null));
check('Sem API não oferece voz',()=>assert.equal(util.getVaultSpeechConstructor({}),null));
check('Reconhece API padrão',()=>assert.equal(util.getVaultSpeechConstructor({SpeechRecognition: FakeSpeech}), FakeSpeech));
check('Reconhece prefixo WebKit no Android',()=>assert.equal(util.getVaultSpeechConstructor({webkitSpeechRecognition: FakeSpeech}), FakeSpeech));
check('Prefere API padrão quando ambas existem',()=>assert.equal(util.getVaultSpeechConstructor({SpeechRecognition: FakeSpeech,webkitSpeechRecognition: class Other{}}), FakeSpeech));
check('Resultado não autorizado nunca é inventado',()=>assert.equal(util.normalizeSpeechCommand(' \n  '),''));
check('Transcrição normalizada sem controles',()=>assert.equal(util.normalizeSpeechCommand('  abrir\nmedicamentos\r '),'abrir medicamentos'));
check('Transcrição limitada a 160 caracteres',()=>assert.equal(util.normalizeSpeechCommand('x'.repeat(300)).length,160));
check('Interface não exige SDK de terceiros',()=>assert.doesNotMatch(src(moduleFile),/import\s+.*from\s+['"](?!@\/)/));
const voice = src(voiceFile);
const command = src(commandFile);
const insight = src(insightFile);
check('Mic não ativa automaticamente',()=>assert.match(voice,/onClick=\{startWithConsent\}/));
check('Consentimento explícito antes de escutar',()=>{assert.match(voice,/setConsentOpen\(true\)/);assert.match(voice,/processamento/);assert.match(voice,/Ativar microfone/);});
check('Voz não grava nem navega',()=>assert.doesNotMatch(voice,/router\.|fetch\(|axios\.|\.put\(|localStorage|sessionStorage|SpeechSynthesis/));
check('Não transmite áudio diretamente pelo VAULT',()=>assert.doesNotMatch(voice,/MediaRecorder|AudioContext|sendBeacon|XMLHttpRequest|navigator\.sendBeacon/));
check('Um reconhecimento de cada vez',()=>{assert.match(voice,/stop\(\);\s*recognitionRef\.current = recognition/);assert.match(voice,/recognition\.continuous = false/);});
check('Português brasileiro e sem hipóteses parciais',()=>{assert.match(voice,/recognition\.lang = "pt-BR"/);assert.match(voice,/recognition\.interimResults = false/);});
check('Só preenche a busca: não executa intenção',()=>{assert.match(voice,/onTranscript\(text\)/);assert.doesNotMatch(voice,/searchVaultBrainCommands|router\.push|window\.location/);});
check('Desmontagem aborta microfone e solta callbacks',()=>{assert.match(voice,/return \(\) =>/);assert.match(voice,/active\.abort\(\)/);assert.match(voice,/active\.onresult = null/);});
check('Erro de permissão não bloqueia busca textual',()=>assert.match(voice,/Microfone não autorizado/));
check('Navegador sem suporte oculta microfone',()=>assert.match(voice,/if \(!supported\) return null/));
check('Cancelamento de voz não inicia captura',()=>assert.match(voice,/onClick=\{\(\) => setConsentOpen\(false\)\}/));
check('Busca por voz é uma única entrada visual',()=>{assert.match(command,/VaultBrainVoiceInput/);assert.doesNotMatch(command,/className="fixed bottom-0/);});
check('Identidade da conta/pessoa reinicia a sessão da busca',()=>{assert.match(command,/\[data\.userId, data\.personId\]/);assert.match(command,/key=\{`\$\{data\.userId/);});
check('Busca rebaixa prioridade de processamento ao digitar',()=>assert.match(command,/useDeferredValue\(query\)/));
check('Não navega usando resultados desatualizados',()=>{assert.match(command,/!queryBusy && results\[selected\]/);assert.match(command,/if \(!queryBusy\) navigate\(item.href\)/);});
check('Modal mantém retorno de foco e Escape',()=>{assert.match(command,/triggerRef\.current\?\.focus/);assert.match(command,/e\.key === "Escape"/);});
check('Área scrollable cabe na tela e respeita safe area',()=>{assert.match(command,/max-h-\[min\(52dvh,420px\)\]/);assert.match(command,/safe-area-inset-bottom/);});
check('Ações continuam com confirmação nos formulários',()=>{assert.match(command,/registros e movimentações exigem confirmação/);assert.doesNotMatch(command,/\.put\(|\.delete\(|fetch\(/);});
check('Scroll do Brain limitado por animation frame',()=>{assert.match(insight,/scrollFrameRef/);assert.match(insight,/requestAnimationFrame\(\(\) =>/);});
check('Cancelamento do scroll ao desmontar',()=>assert.match(insight,/cancelAnimationFrame\(scrollFrameRef\.current\)/));
check('Carrossel respeita redução de movimento',()=>assert.match(insight,/prefers-reduced-motion/));
check('Nenhum nome não aprovado foi introduzido',()=>assert.doesNotMatch([voice,command,insight].join('\n'),/f[eê]nix/i));
check('Sem novo motor clínico',()=>assert.doesNotMatch([voice,src(moduleFile)].join('\n'),/HealthInsight\b|db\.table|Dexie|supabase/));
check('Síntaxe dos arquivos TS/TSX alterados',()=>{
  for (const filename of [moduleFile,voiceFile,commandFile,insightFile]) {
    const ast = ts.createSourceFile(filename,src(filename),ts.ScriptTarget.Latest,true,filename.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
    assert.equal(ast.parseDiagnostics.length,0,`${filename}: ${ast.parseDiagnostics.map(d=>d.messageText).join('; ')}`);
  }
});
console.log(`M46: ${tests} verificações aprovadas.`);
