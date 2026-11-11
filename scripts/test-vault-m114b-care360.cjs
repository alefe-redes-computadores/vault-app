const fs=require("fs"),assert=require("assert");
const read=p=>fs.readFileSync(p,"utf8");
const safety=read("lib/safety-plan.ts"),page=read("app/saude/plano-seguranca/page.tsx"),contacts=read("components/saude/TrustedContactsM114.tsx");
assert(safety.includes("trustedContacts: TrustedContact[]")&&safety.includes("normalizeTrustedContact"));
assert(page.includes("TrustedContactsM114")&&contacts.includes("O VAULT nunca liga nem envia mensagens sozinho"));
assert(contacts.includes("tel:${contact.phone}")&&contacts.includes("sms:${contact.phone}"));
const domain=read("lib/health-reminders/domain.ts"),scheduler=read("lib/health-reminders/scheduler.ts");
assert(domain.includes('health_record:humor')&&domain.includes("sem interpretar ausência"));
assert(scheduler.includes('privateCheckIn')&&scheduler.includes('Lembrete do Vault')&&scheduler.includes('atividade que você configurou'));
const home=read("components/home/HomeCommandCenter.tsx");
// M118: a chave e o evento são constantes locais do NOVO botão. O teste
// verifica a função e seu consumidor, não a grafia do literal no setItem().
const toggle=read('components/home/HomeEssentialToggleM118.tsx');
const center=read('components/home/HomeCommandCenter.tsx');
const pageHome=read('app/page.tsx');
const k=toggle.match(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*["']vault:home:essential:v1["']/);
assert(k,'M114B/M118: chave original deve ser constante do toggle');
const key=k[1];
const escapeRE=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
assert(new RegExp('(?:window\\.)?localStorage\\.getItem\\(\\s*'+escapeRE(key)+'\\s*\\)').test(toggle),
  'M114B/M118: toggle lê a preferência ao montar/reabrir');
assert(new RegExp('(?:window\\.)?localStorage\\.setItem\\(\\s*'+escapeRE(key)+'\\s*,').test(toggle),
  'M114B/M118: toggle grava realmente a preferência');
assert(toggle.includes('setEssential(next)')&&toggle.includes('onClick={toggle}')&&toggle.includes('aria-pressed={essential}'),
  'M114B/M118: controle de preferência funcional e acessível');
const evt=toggle.match(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*["']vault:home:essential-changed["']/);
assert(evt,'M114B/M118: evento de sincronização deve ser declarado');
const eventName=evt[1];
assert(new RegExp('dispatchEvent\\(new Event\\(\\s*'+escapeRE(eventName)+'\\s*\\)\\)').test(toggle),
  'M114B/M118: alteração emite evento à Home');
assert(center.includes('window.addEventListener("vault:home:essential-changed",sync)') &&
       center.includes('window.removeEventListener("vault:home:essential-changed",sync)'),
  'M114B/M118: Central sincroniza e libera listener');
assert(center.includes('localStorage.getItem("vault:home:essential:v1")')&&
       center.includes('setEssential(localStorage.getItem('),
  'M114B/M118: Central restaura estado por armazenamento');
assert((center.match(/!essential\?<ClinicalDisclosure/g)||[]).length===2,
  'M114B/M118: duas áreas secundárias reagem ao modo Essencial');
assert(center.includes('id="home-outras-areas"')&&center.includes('id="home-organizacao"'),
  'M114B/M118: áreas do modo completo preservadas');
assert(!center.includes('onClick={toggleEssential}') && !center.includes('>Modo Essencial</strong>'),
  'M114B/M118: sem duplicidade do controle dentro da Central');
assert(pageHome.includes('<HomeEssentialToggleM118 />')&&toggle.includes('Modo Essencial'),
  'M114B/M118: controle visível da Home e acessível');

console.log("VAULT M114 B: contatos explícitos, check-in privado e mesma Home em modo essencial OK.");
