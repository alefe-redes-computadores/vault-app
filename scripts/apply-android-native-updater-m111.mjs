/** VAULT M111: generated Android platform integration, after M99 Health Connect + exact alarms. */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const read = (file) => fs.readFileSync(file, "utf8");
const config = JSON.parse(read("capacitor.config.json"));
const appId = "com.alefejohsefe.vault";
if (config.appId !== appId) throw new Error("M111: identificador Capacitor divergente.");
const javaRoot = path.join("android/app/src/main/java", ...appId.split("."));
const main = ["MainActivity.java", "MainActivity.kt"].map(name => path.join(javaRoot, name)).find(fs.existsSync);
if (!main) throw new Error("M111: MainActivity gerada não encontrada.");
let source = read(main);
if (!source.includes("VAULT_EDGE_TO_EDGE_V28") || !source.includes("registerPlugin(VaultHealthConnectPlugin"))
  throw new Error("M111: patches Android anteriores não foram aplicados na ordem esperada.");
const marker = "registerPlugin(VaultApkUpdaterPlugin";
if (!source.includes(marker)) {
  const java = main.endsWith(".java");
  const anchor = java ? "registerPlugin(VaultHealthConnectPlugin.class);" : "registerPlugin(VaultHealthConnectPlugin::class.java)";
  if (source.split(anchor).length !== 2) throw new Error("M111: âncora única do bridge Health Connect ausente.");
  source = source.replace(anchor, `${anchor}\n    registerPlugin(VaultApkUpdaterPlugin${java ? ".class" : "::class.java"});`);
}
if (source.split(marker).length !== 2) throw new Error("M111: registro de plugin nativo duplicado.");
fs.writeFileSync(main, source);
for (const name of ["VaultApkUpdaterPlugin.java", "VaultApkFileProvider.java"]) {
  const template = read(`native/updates/${name}`);
  if (!template.startsWith("package __PACKAGE__;")) throw new Error(`M111: template inválido: ${name}`);
  fs.mkdirSync(javaRoot, { recursive: true });
  fs.writeFileSync(path.join(javaRoot, name), template.replace("package __PACKAGE__;", `package ${appId};`));
}
const paths = "android/app/src/main/res/xml/vault_update_paths.xml";
fs.mkdirSync(path.dirname(paths), { recursive: true });
fs.copyFileSync("native/updates/vault_update_paths.xml", paths);

const python = String.raw`
from pathlib import Path
import xml.etree.ElementTree as ET
p=Path('android/app/src/main/AndroidManifest.xml')
if not p.exists(): raise SystemExit('M111: AndroidManifest não existe')
ns='http://schemas.android.com/apk/res/android'; a='{'+ns+'}'
ET.register_namespace('android',ns)
ET.register_namespace('tools','http://schemas.android.com/tools')
tree=ET.parse(p); root=tree.getroot()
if root.tag!='manifest': raise SystemExit('M111: XML raiz inválida')
perms=[x for x in root.findall('uses-permission') if x.get(a+'name')=='android.permission.REQUEST_INSTALL_PACKAGES']
if len(perms)>1: raise SystemExit('M111: permissão duplicada')
if not perms: root.insert(0,ET.Element('uses-permission',{a+'name':'android.permission.REQUEST_INSTALL_PACKAGES'}))
app=root.find('application')
if app is None: raise SystemExit('M111: application ausente')
authority='$'+'{applicationId}.vaultupdateprovider'
providers=[x for x in app.findall('provider') if x.get(a+'authorities')==authority]
if providers: raise SystemExit('M111: FileProvider preexistente; abortar em vez de sobrescrever')
provider=ET.SubElement(app,'provider',{
 a+'name':'com.alefejohsefe.vault.VaultApkFileProvider',
 a+'authorities':authority,a+'exported':'false',a+'grantUriPermissions':'true'
})
ET.SubElement(provider,'meta-data',{a+'name':'android.support.FILE_PROVIDER_PATHS',a+'resource':'@xml/vault_update_paths'})
tree.write(p,encoding='utf-8',xml_declaration=True)
`;
execFileSync("python3", ["-c", python], { stdio: "inherit" });
for (const item of [main, paths, "android/app/src/main/AndroidManifest.xml", ...["VaultApkUpdaterPlugin.java", "VaultApkFileProvider.java"].map(name => path.join(javaRoot,name))]) {
  if (!fs.existsSync(item) || fs.statSync(item).size < 3) throw new Error(`M111: saída nativa ausente: ${item}`);
}
console.log("M111 NATIVE PATCH: identidade VAULT, bridge, FileProvider privado e consentimento Android configurados.");
