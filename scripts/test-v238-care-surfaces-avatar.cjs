#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const list=read('app/saude/medicamentos/page.tsx');
for(const token of ['decideMedicationCarePath','renewalsByMedication','careDecision.label','careAction.href'])assert(list.includes(token),`lista: ${token}`);
assert(list.includes('medicationAccessAction('),'roteamento legado preservado como fallback');
const detail=read('app/saude/medicamentos/detalhes/page.tsx');
for(const token of ['Linha de cuidado','careDecision.actionHref','careDecision.actionLabel'])assert(detail.includes(token),`detalhe: ${token}`);
assert(detail.includes('(brainCareAction?.evidence || careDecision.evidence).slice(0,3)'),'detalhe: evidência canônica com fallback');
const today=read('app/hoje/page.tsx');
for(const token of ['decideMedicationCarePath','renewalsByMedication','stage === "prescription_needed"'])assert(today.includes(token),`hoje: ${token}`);
const avatar=read('components/saude/HealthAvatar3D.tsx');
for(const token of ['V238: mostrador neutro','hour.rotation.z','minute.rotation.z','sem cobrir o visor','const speaker=','const screenDot='])assert(avatar.includes(token),`avatar: ${token}`);
assert(!avatar.includes('new THREE.RingGeometry(.018,.025,20)'),'relógio artificial antigo removido');
assert(avatar.includes('expressionLidScaleY.get(object)')&&avatar.includes('expressionEyeScaleY.get(object)'),'regressão ocular preservada');
console.log('V238 CARE SURFACES + AVATAR: lista, detalhes, Hoje, relógio, celular e olhos OK');
