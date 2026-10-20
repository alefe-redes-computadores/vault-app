const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const picker=read('components/cofre/BankInstitutionPicker.tsx');
assert(picker.includes('BANK_INSTITUTIONS')&&picker.includes('normalizeBankName')&&picker.includes('resolveBankInstitution'),'V201 bank selector must reuse canonical catalog');
assert(picker.includes('createPortal(')&&picker.includes('document.body'),'Modal must escape transformed form ancestors');
assert(picker.includes('select(query)')&&picker.includes('Usar “'),'Custom institutions must be accepted');
for(const p of ['app/contas/novo/page.tsx','app/contas/editar/page.tsx','app/cartoes/novo/page.tsx','app/cartoes/editar/page.tsx']){
  const s=read(p);
  assert(s.includes('BankInstitutionPicker'),'Missing V201 bank picker in '+p);
  assert(s.includes('onChange={(name) => handleChange("bank_name", name)}'),'Persist canonical bank_name in '+p);
  assert(!/<Input\s+label="Nome do Banco/.test(s),'Old plain bank field still present in '+p);
}
for(const [path,label] of [['hooks/usePaginatedCards.ts','cards'],['hooks/usePaginatedCredentials.ts','credentials']]){
  const s=read(path);
  assert(s.includes('if (!user?.id || !personId)'),'Must block DB read until active person is known: '+path);
  assert(s.includes(label==='cards' ? 'const filteredCards = personId ? applyPersonFilter(queriedCards' : 'const filteredCredentials = personId ? applyPersonFilter(queriedCredentials'),'Render must not expose stale rows from previous person');
  const func=s.slice(s.indexOf('function applyPersonFilter('));
  assert(/if \(!personId\) \{\s*return \[\];/.test(func),'Must not expose other persons while person ID is missing: '+label);
}
const diagnostic=read('app/diagnostico/page.tsx');
for(const key of ['"vaults", "vaults"','"credentials", "credentials"','"bankCards", "cards"','"cirurgias", "cirurgias"','"medicos", "medicos"'])assert(diagnostic.includes(key),'Missing domain '+key);
assert(diagnostic.includes('index += 4') && diagnostic.includes('Promise.all(TABLES.slice(index,index+4).map(checkOne))'),'Limit diagnostics concurrency');
assert(diagnostic.includes('if (!user?.id || !isOnline || checking) return;'),'Diagnostics must be user-triggered, online, guarded');
assert(diagnostic.includes('lastCoverageCheck'),'Diagnostics must show freshness');
const avatar=read('components/saude/HealthAvatar3D.tsx');
assert(avatar.includes('const frontalHairline = mesh(new THREE.ShapeGeometry(hairlineShape)'),'Static geometric hairline');
assert(avatar.includes("appearance.hat === 'none'"),'No redundant hairline below hat');
console.log('VAULT V201: bank catalog, person scope, manual diagnostics, static avatar hairline OK');
