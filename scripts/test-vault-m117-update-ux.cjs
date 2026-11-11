/* M117: deterministic update UX contracts. No network, no clinical data. */
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');
const moduleFile='lib/updates/update-navigation-m117.ts';
const js=ts.transpileModule(read(moduleFile),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod=new Module(moduleFile,module);mod._compile(js,moduleFile);
const nav=mod.exports,store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
assert.equal(nav.VAULT_UPDATE_DESTINATION_M117,'/mais#vault-updates');
assert.equal(nav.readIgnoredUpdateBuildM117(storage),null);
const snap={runtime:'android',phase:'ready',decision:'available',installedBuild:2045,release:{build:2059}};
assert.equal(nav.shouldShowUpdatePromptM117(snap,null),true);
assert.equal(nav.shouldShowUpdatePromptM117({...snap,runtime:'web'},null),false);
assert.equal(nav.shouldShowUpdatePromptM117({...snap,phase:'checking'},null),false);
assert.equal(nav.shouldShowUpdatePromptM117({...snap,decision:'current'},null),false);
assert.equal(nav.shouldShowUpdatePromptM117({...snap,installedBuild:2059},null),false);
assert.equal(nav.shouldShowUpdatePromptM117({...snap,release:{build:0}},null),false);
nav.ignoreUpdateBuildM117(storage,2059);
assert.equal(nav.readIgnoredUpdateBuildM117(storage),2059);
assert.equal(nav.shouldShowUpdatePromptM117(snap,nav.readIgnoredUpdateBuildM117(storage)),false);
assert.equal(nav.shouldShowUpdatePromptM117({...snap,release:{build:2060}},nav.readIgnoredUpdateBuildM117(storage)),true);
store.set(nav.VAULT_UPDATE_IGNORE_KEY_M117,'nonsense');assert.equal(nav.readIgnoredUpdateBuildM117(storage),null);
assert.equal(nav.readIgnoredUpdateBuildM117({getItem(){throw Error('storage blocked')}}),null);
nav.ignoreUpdateBuildM117({setItem(){throw Error('storage blocked')}},2100);
const home=read('app/page.tsx'),providers=read('components/Providers.tsx'),center=read('components/updates/VaultUpdateCenter.tsx'),flow=read('components/updates/VaultNativeUpdateFlow.tsx'),core=read('lib/updates/native-apk-updater.ts'),java=read('native/updates/VaultApkUpdaterPlugin.java'),notif=read('lib/updates/notifications.ts');
assert(home.includes('<VaultUpdateHomePromptM117 />'));
assert(providers.includes('router.push(VAULT_UPDATE_DESTINATION_M117)'));
assert(center.includes('window.location.hash !== VAULT_UPDATE_FRAGMENT_M117')&&center.includes('target.closest("details")')&&center.includes('disclosure.open = true')&&center.includes('scrollIntoView'));
assert(notif.includes('Toque para abrir a Central de Atualizações'));
assert(core.includes('checkInstallPermission(): Promise<{ granted: boolean }>'));
assert(java.includes('public void checkInstallPermission(PluginCall call)')&&java.includes('canRequestPackageInstalls()'));
assert(flow.includes('await native.installVerified(metadata)')&&flow.includes('setStage("permission")')&&flow.includes('setStage("permitted")')&&flow.includes('Permissão concedida')&&flow.includes('Continuar instalação'));
assert(java.includes('verifyPackage(file, m.build, m.version, m.cert)')&&java.includes('FileProvider.getUriForFile')&&java.includes('ACTION_VIEW')&&java.includes('FLAG_GRANT_READ_URI_PERMISSION'));
assert(flow.includes('native.downloadVerified(metadata)')&&flow.includes('cancelDownload()')&&flow.includes('Baixar e atualizar no VAULT'));
for(const path of ['components/updates/VaultNativeUpdateFlow.tsx','components/updates/VaultUpdateHomePromptM117.tsx','lib/updates/native-apk-updater.ts','lib/updates/update-navigation-m117.ts']){
 const src=read(path);const ast=ts.createSourceFile(path,src,ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.deepEqual(ast.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')),[],path);
}
console.log('M117: home, deeplink, consentimento, instalador e políticas de versão OK.');
