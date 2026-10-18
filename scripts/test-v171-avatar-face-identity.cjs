const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = file => fs.readFileSync(file, "utf8");
const style = read("lib/health-profile/avatar-style.ts");
const framing = read("lib/health-profile/avatar-framing.ts");
const editor = read("components/saude/AvatarStyleEditor.tsx");
const scene = read("components/saude/HealthAvatar3D.tsx");
const fallback = read("components/saude/HealthBody.tsx");

for (const field of ["hair: AvatarHair", "hairColor: string", "facialHair: AvatarFacialHair"]) assert.match(style, new RegExp(field));
assert.match(style, /hairValues = \['short', 'fade', 'curly', 'bald'\]/);
assert.match(style, /facialHairValues = \['none', 'stubble', 'goatee', 'beard'\]/);
assert.match(style, /hairColor: color\(data\.hairColor/);
assert.match(framing, /style\.hair,style\.facialHair/);

assert.match(editor, /\['face','Rosto',UserRound\]/);
assert.match(editor, /Cor do cabelo e barba/);
assert.match(editor, /value\.hair!==\'bald\'/);

assert.match(scene, /appearance\.hair==='fade'/);
assert.match(scene, /appearance\.hair==='curly'/);
assert.match(scene, /appearance\.facialHair==='stubble'/);
assert.match(scene, /appearance\.facialHair==='goatee'/);
assert.match(scene, /appearance\.facialHair==='beard'/);
assert.match(scene, /materials\.hair\.color\.set\(value\.hairColor\)/);
assert.match(scene, /materials\.facialHair\.color\.set\(value\.hairColor\)/);
assert.doesNotMatch(scene, /setAnimationLoop/);

assert.match(fallback, /appearance\.hair==='curly'/);
assert.match(fallback, /appearance\.facialHair==='beard'/);
assert.match(fallback, /fill=\{appearance\.hairColor\}/);

console.log("V171 avatar face identity contract: OK");
