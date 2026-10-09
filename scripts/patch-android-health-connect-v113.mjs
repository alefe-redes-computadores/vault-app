import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const read = file => fs.readFileSync(file,"utf8");
const write = (file,s) => fs.writeFileSync(file,s);
const config = JSON.parse(read("capacitor.config.json"));
if (config.appId !== "com.alefejohsefe.vault") throw Error("V113: aplicação Android inesperada.");
const javaDir = "android/app/src/main/java/com/alefejohsefe/vault";
fs.mkdirSync(javaDir,{recursive:true});
for (const name of ["VaultHealthConnectPlugin.kt","PermissionsRationaleActivity.kt"]) fs.copyFileSync(`native/health-connect/${name}`,`${javaDir}/${name}`);
const mainFile = ["MainActivity.java","MainActivity.kt"].map(n => path.join(javaDir,n)).find(fs.existsSync);
if (!mainFile) throw Error("V113: MainActivity não encontrada.");
let main = read(mainFile);
if (!main.includes("registerPlugin(VaultHealthConnectPlugin")) {
  if(mainFile.endsWith(".java")) {
    if (!main.includes("import android.os.Bundle;")) main = main.replace(/(package [^;]+;)/,"$1\nimport android.os.Bundle;");
    if(main.includes("super.onCreate(savedInstanceState);")) main = main.replace("super.onCreate(savedInstanceState);","registerPlugin(VaultHealthConnectPlugin.class);\n    super.onCreate(savedInstanceState);");
    else main = main.replace(/(extends BridgeActivity\s*\{)/,"$1\n  @Override protected void onCreate(Bundle savedInstanceState) {\n    registerPlugin(VaultHealthConnectPlugin.class);\n    super.onCreate(savedInstanceState);\n  }\n");
  } else {
    if (!main.includes("import android.os.Bundle")) main = main.replace(/(package [^\n]+)/,"$1\nimport android.os.Bundle");
    if(main.includes("super.onCreate(savedInstanceState)")) main = main.replace("super.onCreate(savedInstanceState)","registerPlugin(VaultHealthConnectPlugin::class.java)\n        super.onCreate(savedInstanceState)");
    else main = main.replace(/(class MainActivity\s*:\s*BridgeActivity\(\)\s*\{)/,"$1\n    override fun onCreate(savedInstanceState: Bundle?) {\n        registerPlugin(VaultHealthConnectPlugin::class.java)\n        super.onCreate(savedInstanceState)\n    }\n");
  }
}
if(!main.includes("registerPlugin(VaultHealthConnectPlugin")) throw Error("V113: registro do plugin não aplicado.");
write(mainFile,main);
const rootFile = "android/build.gradle";
let root = read(rootFile);
root = root.replace(/com\.android\.tools\.build:gradle:[\d.]+/g,"com.android.tools.build:gradle:8.9.1");
if(!root.includes("kotlin-gradle-plugin")) root = root.replace(/(dependencies\s*\{)/,"$1\n        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:2.0.21'");
if(!root.includes("kotlin_version = '2.0.21'")) root = root.replace(/(buildscript\s*\{)/,"$1\n    ext.kotlin_version = '2.0.21'");
write(rootFile,root);
let variables = read("android/variables.gradle");
variables = variables.replace(/compileSdkVersion\s*=\s*\d+/,"compileSdkVersion = 36");
variables = variables.replace(/minSdkVersion\s*=\s*(\d+)/,(_,v) => `minSdkVersion = ${Math.max(26,Number(v))}`);
write("android/variables.gradle",variables);
const wrapper = "android/gradle/wrapper/gradle-wrapper.properties";
write(wrapper,read(wrapper).replace(/gradle-[\d.]+-(all|bin)\.zip/,"gradle-8.11.1-$1.zip"));
const appFile = "android/app/build.gradle";
let app = read(appFile);
if(!app.includes("VAULT_HEALTH_CONNECT_V113")) app += `
// VAULT_HEALTH_CONNECT_V113 — stable API, read-only bridge.
apply plugin: 'org.jetbrains.kotlin.android'
android {
    compileOptions { sourceCompatibility JavaVersion.VERSION_17; targetCompatibility JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = '17' }
}
dependencies {
    implementation 'androidx.health.connect:connect-client:1.1.0'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
}
`;
write(appFile,app);
execFileSync("python3",["-c",String.raw`
import xml.etree.ElementTree as ET
from pathlib import Path
p=Path("android/app/src/main/AndroidManifest.xml"); ns="http://schemas.android.com/apk/res/android"; a="{"+ns+"}"
ET.register_namespace("android",ns);tree=ET.parse(p);root=tree.getroot()
for name in ["READ_SLEEP","READ_WEIGHT","READ_BLOOD_PRESSURE","READ_HEART_RATE","READ_OXYGEN_SATURATION","READ_EXERCISE"]:
 full="android.permission.health."+name
 if not any(x.get(a+"name")==full for x in root.findall("uses-permission")):ET.SubElement(root,"uses-permission",{a+"name":full})
queries=root.find("queries")
if queries is None:queries=ET.SubElement(root,"queries")
if not any(x.get(a+"name")=="com.google.android.apps.healthdata" for x in queries.findall("package")):ET.SubElement(queries,"package",{a+"name":"com.google.android.apps.healthdata"})
app=root.find("application")
if app is None:raise SystemExit("Manifest sem application")
name="com.alefejohsefe.vault.PermissionsRationaleActivity"
activity=next((x for x in app.findall("activity") if x.get(a+"name")==name),None)
if activity is None:
 activity=ET.SubElement(app,"activity",{a+"name":name,a+"exported":"true"})
 intent=ET.SubElement(activity,"intent-filter");ET.SubElement(intent,"action",{a+"name":"androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE"})
alias="com.alefejohsefe.vault.ViewPermissionUsageActivity"
if not any(x.get(a+"name")==alias for x in app.findall("activity-alias")):
 item=ET.SubElement(app,"activity-alias",{a+"name":alias,a+"exported":"true",a+"targetActivity":name,a+"permission":"android.permission.START_VIEW_PERMISSION_USAGE"})
 intent=ET.SubElement(item,"intent-filter");ET.SubElement(intent,"action",{a+"name":"android.intent.action.VIEW_PERMISSION_USAGE"});ET.SubElement(intent,"category",{a+"name":"android.intent.category.HEALTH_PERMISSIONS"})
tree.write(p,encoding="utf-8",xml_declaration=True)
`],{stdio:"inherit"});
console.log("V113: Health Connect, permissões de leitura, rationale e ferramentas Android configurados.");
