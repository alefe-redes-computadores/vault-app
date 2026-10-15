const assert=require('node:assert/strict');
const fs=require('node:fs');

const three=fs.readFileSync('components/saude/HealthAvatar3D.tsx','utf8');
const avatar=fs.readFileSync('components/saude/HealthAvatar.tsx','utf8');
const health=fs.readFileSync('app/saude/minha-saude/page.tsx','utf8');

assert(three.includes('new THREE.CircleGeometry(.72,32)'),'inspection stage missing');
assert(three.includes('new THREE.RingGeometry(.70,.715,48)'),'stage depth ring missing');
assert(three.includes('const brainGlyph=new THREE.Group()'),'geometric Brain core missing');
assert(three.includes('const brainPanel=mesh(softBox(.27,.24,.025,.018)'),'angular Brain panel missing');
assert(!three.includes('label("VAULT",BRAIN_BRAND)'),'legacy textured Brain badge retained');
assert(three.includes('[stage,stageRing].forEach'),'scene resources are not disposed');
assert(three.includes('powerPreference: "low-power"'),'low-power renderer preference removed');
assert(three.includes('IntersectionObserver'),'off-screen pause removed');
assert(three.includes('document.hidden'),'background-tab pause removed');
assert(avatar.includes('sm:rounded-2xl'),'mobile-first expanded viewport missing');
assert(health.includes('border-l-emerald-300/40'),'health identity hierarchy missing');
assert(health.includes('border-l-violet-300/40'),'Brain hierarchy missing');
console.log('V164: angular Brain, inspection stage, compact health hierarchy, viewport and low-power rendering contracts passed');
