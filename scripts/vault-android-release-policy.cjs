#!/usr/bin/env node
'use strict';
/** Pure, fail-closed policy for a GitHub Actions APK promotion. Never contacts GitHub. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const REPO = 'alefe-redes-computadores/vault-app';
const SHA = /^[0-9a-f]{40}$/i;
const DIGEST = /^sha256:([0-9a-f]{64})$/i;
const pos = n => Number.isSafeInteger(n) && n > 0;
const bad = why => { throw new Error('VAULT_RELEASE_STOP: ' + why); };
function evaluate({run, artifacts, expectedRunId, expectedSha, mainSha, allowStale=false, approvedStaleSha=''}) {
  if (!pos(expectedRunId) || !SHA.test(expectedSha || '') || !SHA.test(mainSha || '')) bad('parâmetros de identidade inválidos');
  if (!run || typeof run !== 'object' || Array.isArray(run)) bad('run ausente');
  if (run.id !== expectedRunId || !pos(run.run_number) || run.run_number > 2147483647) bad('run_id/build divergentes');
  if (run.head_sha !== expectedSha || run.head_branch !== 'main' || run.head_repository?.full_name !== REPO) bad('fonte fora da main canônica');
  if (run.status !== 'completed' || run.conclusion !== 'success') bad('Action original não aprovada');
  if (!['push','workflow_dispatch'].includes(run.event)) bad('tipo de execução não permitido');
  if (typeof run.path !== 'string' || run.path !== ".github/workflows/build-android.yml") bad('workflow original não autorizado');
  if (mainSha !== expectedSha && !(allowStale === true && approvedStaleSha === expectedSha)) bad('main avançou: exige autorização explícita para SHA anterior');
  const items = artifacts?.artifacts;
  if (!Array.isArray(items)) bad('lista de artefatos indisponível');
  const hits = items.filter(a => a && a.name === 'Vault-App-debug');
  if (hits.length !== 1) bad('artefato APK ausente ou ambíguo');
  const a = hits[0];
  if (!pos(a.id) || !pos(a.size_in_bytes) || a.expired !== false || !a.expires_at || Date.parse(a.expires_at) <= Date.now()) bad('artefato inválido ou expirado');
  if (a.workflow_run?.id !== expectedRunId || a.workflow_run?.head_sha !== expectedSha || a.workflow_run?.head_branch !== 'main') bad('proveniência do artefato divergente');
  if (a.archive_download_url !== `https://api.github.com/repos/${REPO}/actions/artifacts/${a.id}/zip`) bad('origem do artefato inválida');
  const digest = DIGEST.exec(a.digest || '');
  if (!digest) bad('GitHub não forneceu digest verificável do ZIP original');
  return {runId:expectedRunId, build:run.run_number, sha:expectedSha, artifactId:a.id, archiveSha256:digest[1].toLowerCase(),
    tag:`vault-android-b${run.run_number}`, archiveUrl:a.archive_download_url, expiresAt:a.expires_at};
}
function parseRelease(raw) {
  if (!raw || raw.draft !== false || raw.prerelease !== false) bad('última release não certificada');
  const m=/^vault-android-b([1-9]\d{0,9})$/.exec(raw.tag_name||'');
  if (!m || !pos(Number(m[1]))) bad('tag anterior inválida');
  const body=String(raw.body||'');
  const get=k=>{const v=new RegExp(`^${k}=([^\\r\\n]+)$`,'m').exec(body);return v?v[1].trim():''};
  if (get('VAULT_BUILD')!==m[1] || !SHA.test(get('VAULT_COMMIT'))) bad('metadados da release anterior inválidos');
  const asset=(raw.assets||[]).filter(a=>a.name==='Vault-App.apk');
  if(asset.length!==1 || asset[0].browser_download_url!==`https://github.com/${REPO}/releases/download/${raw.tag_name}/Vault-App.apk`) bad('APK anterior não verificável');
  if(!DIGEST.test('sha256:'+get('VAULT_APK_SHA256'))) bad('SHA da release anterior ausente');
  const cert=get('VAULT_CERT_SHA256');
  if(cert && !/^[0-9a-f]{64}$/i.test(cert)) bad('certificado anterior inválido');
  return {build:Number(m[1]),sha:get('VAULT_COMMIT'),checksum:get('VAULT_APK_SHA256').toLowerCase(),certificate:cert.toLowerCase(),tag:raw.tag_name};
}
if(require.main===module){
  try {
    assert.equal(process.argv[2],'check','comando inválido');
    const [runFile,artifactFile,latestFile,runId,sha,mainSha,stale,approved] = process.argv.slice(3);
    const output=evaluate({run:JSON.parse(fs.readFileSync(runFile)),artifacts:JSON.parse(fs.readFileSync(artifactFile)),expectedRunId:Number(runId),expectedSha:sha,mainSha,allowStale:stale==='1',approvedStaleSha:approved||''});
    const previous=parseRelease(JSON.parse(fs.readFileSync(latestFile)));
    if(output.build<=previous.build) bad('build não supera a última release');
    process.stdout.write(JSON.stringify({...output,previous})+'\n');
  } catch(e){process.stderr.write((e?.message||String(e))+'\n');process.exitCode=1;}
}
module.exports={evaluate,parseRelease};
