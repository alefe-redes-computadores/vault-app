/** CI-only verification of the generated (not tracked) Android platform after M111 patch. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const root = path.join("android/app/src/main/java", ..."com.alefejohsefe.vault".split("."));
const read = p => fs.readFileSync(p,"utf8");
const main = ["MainActivity.java","MainActivity.kt"].map(n=>path.join(root,n)).find(fs.existsSync);
assert(main,"MainActivity Android gerada");
assert.equal(read(main).split("registerPlugin(VaultApkUpdaterPlugin").length-1,1,"plugin registrado uma única vez");
const java = read(path.join(root,"VaultApkUpdaterPlugin.java"));
assert(java.includes('package com.alefejohsefe.vault;'));
for (const feature of ['verifyPackage(target, m.build, m.version, m.cert)','verifyPackage(file, m.build, m.version, m.cert)','PACKAGE_ID + ".vaultupdateprovider"','canRequestPackageInstalls()','FLAG_GRANT_READ_URI_PERMISSION','cancelDownload','getCacheDir()','SHA-256','sha256(file)'])
  assert(java.includes(feature),`M111: ${feature}`);
const xml=read('android/app/src/main/AndroidManifest.xml');
assert.equal(xml.split('android.permission.REQUEST_INSTALL_PACKAGES').length-1,1);
assert(xml.includes('com.alefejohsefe.vault.VaultApkFileProvider') && xml.includes('vault_update_paths'));
assert(xml.includes('android:exported="false"') && xml.includes('android:grantUriPermissions="true"'));
assert(read('android/app/src/main/res/xml/vault_update_paths.xml').includes('path="vault-apk-updates/"'));
console.log('VAULT M111: ponte Android e permissões geradas sem duplicação.');
