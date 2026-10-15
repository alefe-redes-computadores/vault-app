const assert=require('node:assert/strict'),fs=require('node:fs');
const read=x=>fs.readFileSync(x,'utf8');
const avatar=read('components/saude/HealthAvatar.tsx');
const editor=read('components/saude/AvatarStyleEditor.tsx');
const scene=read('components/saude/HealthAvatar3D.tsx');
const page=read('app/saude/minha-saude/page.tsx');
assert(avatar.includes('Visualização e controles'));
assert(avatar.includes('toggleExpanded'));
assert(avatar.includes('onEmptyTap={toggleExpanded}'));
assert(avatar.includes('AvatarStyleEditor value={appearance}'));
assert(editor.includes('Toque para personalizar'));
assert(editor.includes('group-open:rotate-180'));
assert(editor.includes('Check size={14}'));
assert(scene.includes('narrower face with a soft jaw/chin'));
// V158: aceitar tanto o emblema antigo quanto o núcleo geométrico interativo V164.
// Em V164 não se deve recolocar a placa plana obsoleta apenas para satisfazer este teste.
assert(
  scene.includes('const brainBadge=mesh(new THREE.PlaneGeometry(.255,.255)') ||
  (scene.includes('const brainPanel=mesh(softBox(') &&
   scene.includes('brainPanel.userData.action="brain"') &&
   scene.includes('brainGlyph.add(segment)') &&
   scene.includes('segment.userData.action="brain"')),
  'Brain deve manter o emblema V158 ou o núcleo geométrico interativo V164'
);
assert(scene.includes('const lace=mesh('));
assert(page.includes('Corpo e sinais · explorar regiões'));
assert(page.includes('Histórico completo, tendências e datas'));
assert(page.includes("gravidadeSeguranca==='critica'"));
assert(page.includes('V157 ANATOMICAL LINKS'),'Retain V157 body links');
assert(!/\.strip\(/.test(page+avatar+editor+scene));
for (const path of ['app/saude/minha-saude/page.tsx','components/saude/HealthAvatar.tsx','components/saude/AvatarStyleEditor.tsx','components/saude/HealthAvatar3D.tsx'])assert(fs.existsSync(path));
console.log('V158: geometria, identidade, estilo, gravidade, histórico e V157 preservados');
