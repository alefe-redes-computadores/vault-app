// V202: preview and editor must not leak a camera framing to each other.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const shell = fs.readFileSync('components/saude/HealthAvatar.tsx','utf8');
const scene = fs.readFileSync('components/saude/HealthAvatar3D.tsx','utf8');
for (const [file,src] of [['components/saude/HealthAvatar.tsx',shell],['components/saude/HealthAvatar3D.tsx',scene]]) {
  const syntax = ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(syntax.parseDiagnostics.length,0,`Syntax error in ${file}: ${syntax.parseDiagnostics.map(d=>d.messageText).join('; ')}`);
}
assert(shell.includes("const shouldMount3D=expanded&&mode==='3d'&&size==='expanded'"),'compact surface can mount WebGL before explicit expansion');
assert(shell.includes('framing={framing}'),'expanded 3D inspection lost its selected framing');
assert(shell.includes("setFraming('body')"),'close must reset stored inspection framing');
assert(shell.includes("setSize('compact')"),'opening page must normalize legacy size without resurrecting expanded modal');
assert(!shell.includes('Ocultar no perfil'),'current Avatar must remain available from the profile');
assert(shell.includes("if(size!=='expanded')return"),'compact preview can accidentally change editor framing');
assert(shell.includes("parseAvatarFraming(stored)"),'legacy persisted preference parser removed');
assert(scene.includes('controller.current?.preview()'),'3D compact transition did not reset scene');
assert(scene.includes("cameraTransition=null;model.rotation.y=0;camera.zoom=1"),'preview must cancel transitions, snap front and reset zoom');
assert(scene.includes("avatarCameraFrame('body')"),'preview must restore canonical full-body camera');
assert(scene.includes("controller.current?.viewport(compact)"),'GPU render ratio not updated at size changes');
assert(scene.includes('compactRef.current,constrainedDevice'),'WebGL budget should follow current mode');
assert(scene.includes("const noseContour=mesh(taperedBox(")&&scene.includes("reduz o nariz bulboso"),'planar facial refinement did not apply');
assert(scene.includes('const beard=mesh(new THREE.CylinderGeometry(.128,.077,.12,12)'),'oversized facial hair was not reduced');
assert(!scene.includes('requestAnimationFrame(animate)'),'perpetual render loop reintroduced');
assert(scene.includes('renderer.forceContextLoss()'),'WebGL cleanup removed');
assert(scene.includes('onFramingChange?.(\'body\')'),'keyboard Home must reset framing');
console.log('VAULT V202: preview canonical, camera lifecycle, GPU and facial geometry contracts OK');
