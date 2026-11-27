/** Development draft. Visual search only; never a diagnostic classifier or persistence authority.
 * The canonical CAS key allowlist remains unchanged until the Guardian authorizes expansion.
 */
export const LEGACY_TREATMENT_VISUAL_KEYS = ['activity','heart','clipboard','shield','calendar','brain','stethoscope','target','leaf','waypoints','heartpulse','pill'] as const;
export const CATEGORIES = ['Saúde mental e emoções','Sono e descanso','Neurologia e atenção','Mobilidade e saúde física','Dor e acompanhamento','Saúde cardiovascular','Respiração','Visão e audição','Saúde metabólica','Medicamentos','Saúde geral e prevenção'] as const;
type Category = typeof CATEGORIES[number];
type Entry = {key:string;lucide:string;label:string;category:Category;aliases:readonly string[];legacy:boolean};
const entry = (key:string,lucide:string,label:string,category:Category,aliases:readonly string[],legacy=false):Entry => ({key,lucide,label,category,aliases,legacy});
export const TREATMENT_VISUAL_LIBRARY:readonly Entry[] = [
 entry('activity','Activity','Atividade','Mobilidade e saúde física',['dor crônica','dor','atividade física','movimento','exercício'],true),
 entry('heart','HeartHandshake','Cuidado','Saúde mental e emoções',['depressão','acolhimento','emoções','apoio','cuidado'],true),
 entry('clipboard','ClipboardList','Acompanhamento','Dor e acompanhamento',['acompanhamento','consultas','plano','rotina'],true),
 entry('shield','ShieldCheck','Proteção','Saúde geral e prevenção',['prevenção','proteção','segurança'],true),
 entry('calendar','CalendarDays','Calendário','Saúde geral e prevenção',['consulta','agenda','calendário','rotina'],true),
 entry('brain','Brain','Mente','Neurologia e atenção',['tdah','déficit de atenção','atenção','cérebro','mente','neurologia'],true),
 entry('stethoscope','Stethoscope','Cuidado clínico','Dor e acompanhamento',['dor crônica','clínico','médico','consulta','acompanhamento'],true),
 entry('target','Target','Foco','Neurologia e atenção',['atenção','foco','concentração'],true),
 entry('leaf','Leaf','Equilíbrio','Saúde mental e emoções',['ansiedade','calma','equilíbrio','relaxamento'],true),
 entry('waypoints','Waypoints','Conexões','Neurologia e atenção',['tdah','conexões','atenção','neurologia'],true),
 entry('heartpulse','HeartPulse','Cardíaco','Saúde cardiovascular',['cardíaco','coração','batimentos','cardiovascular'],true),
 entry('pill','Pill','Medicação','Medicamentos',['medicamentos','remédio','medicação','farmácia','tratamento'],true),
 entry('brain-circuit','BrainCircuit','Atenção','Neurologia e atenção',['tdah','atenção','déficit de atenção','concentração','conexões']),
 entry('waves','Waves','Calma','Saúde mental e emoções',['ansiedade','calma','equilíbrio','relaxamento']),
 entry('moon','Moon','Sono','Sono e descanso',['insônia','sono','dormir','lua','descanso']),
 entry('moon-star','MoonStar','Noturno','Sono e descanso',['insônia','noite','noturno','sono']),
 entry('bed-double','BedDouble','Descanso','Sono e descanso',['insônia','sono','descanso','cama']),
 entry('cloud-moon','CloudMoon','Relaxamento','Sono e descanso',['relaxamento','sono','descanso','noite']),
 entry('bone','Bone','Ossos','Mobilidade e saúde física',['ossos','ortopedia','articulação','fratura']),
 entry('accessibility','Accessibility','Mobilidade','Mobilidade e saúde física',['dor crônica','mobilidade','acessibilidade','reabilitação']),
 entry('hand','Hand','Membros','Mobilidade e saúde física',['mãos','braço','membros','movimento']),
 entry('shield-plus','ShieldPlus','Prevenção','Saúde geral e prevenção',['prevenção','saúde geral','proteção']),
 entry('eye','Eye','Visão','Visão e audição',['visão','olhos','oftalmologia']),
 entry('ear','Ear','Audição','Visão e audição',['audição','ouvido','otorrino']),
 entry('wind','Wind','Respiração','Respiração',['ansiedade','respiração','respirar','pulmonar']),
 entry('droplet','Droplet','Metabólico','Saúde metabólica',['metabólico','metabolismo','glicemia','hidratação']),
 entry('person-standing','PersonStanding','Postura','Mobilidade e saúde física',['postura','fisioterapia','mobilidade']),
 entry('footprints','Footprints','Caminhada','Mobilidade e saúde física',['caminhada','passos','movimento']),
 entry('timer','Timer','Tempo','Dor e acompanhamento',['horário','tempo','rotina','duração']),
 entry('book-heart','BookHeart','Acolhimento','Saúde mental e emoções',['depressão','acolhimento','emocional','diário']),
 entry('smile','Smile','Emoções','Saúde mental e emoções',['depressão','emoções','humor','bem estar']),
 entry('focus','Focus','Concentração','Neurologia e atenção',['tdah','atenção','concentração','foco']),
 entry('sparkles','Sparkles','Bem-estar','Saúde geral e prevenção',['bem estar','autocuidado','qualidade de vida']),
 entry('folder-heart','FolderHeart','Cuidado contínuo','Dor e acompanhamento',['acompanhamento','cuidado','dor crônica','histórico'])
];
export function normalizeTreatmentIconSearch(value:unknown):string {
 return typeof value==='string'?value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('pt-BR').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' '):'';
}
const prepared = TREATMENT_VISUAL_LIBRARY.map((item,index)=>({item,index, aliases:item.aliases.map(normalizeTreatmentIconSearch), searchable:normalizeTreatmentIconSearch([item.label,item.category,item.key,...item.aliases].join(' '))}));
/** Search is free text and does not alter selected key, medical data, or any stored row. */
export function searchTreatmentVisualIcons(query:unknown,category?:Category):readonly Entry[]{
 const words=normalizeTreatmentIconSearch(query).split(' ').filter(Boolean);
 return prepared.filter(x=>(!category||x.item.category===category)&&words.every(w=>x.searchable.includes(w))).map(x=>x.item);
}
/** Suggestions match whole words/phrases in the user-entered title. No fallback by ID or diagnosis. */
export function suggestTreatmentVisualIcons(title:unknown,limit=6):readonly Entry[]{
 const normalized=normalizeTreatmentIconSearch(title);if(!normalized||!Number.isFinite(limit)||limit<=0)return [];
 const padded=` ${normalized} `;
 return prepared.map(x=>({...x,score:Math.max(0,...x.aliases.map(alias=>alias&&padded.includes(` ${alias} `)?(normalized===alias?100:20)+alias.split(' ').length*10+alias.length:0))})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,Math.min(12,Math.floor(limit))).map(x=>x.item);
}
/** Existing 12-key authority is not expanded by the search catalogue. */
export function canPersistWithCurrentCas(key:unknown):boolean {
 return key==='unassigned'||(typeof key==='string'&&(LEGACY_TREATMENT_VISUAL_KEYS as readonly string[]).includes(key));
}
/** UI-only equivalent messages; preserve first text and distinguish different punctuation/negation. */
export function distinctClinicalAlertMessages(messages:readonly unknown[]):string[]{
 const seen=new Set<string>();const result:string[]=[];
 for(const message of messages){if(typeof message!=='string')continue;const trimmed=message.trim();if(!trimmed)continue;const key=trimmed.normalize('NFC').replace(/\s+/gu,' ').toLocaleLowerCase('pt-BR');if(seen.has(key))continue;seen.add(key);result.push(trimmed);}
 return result;
}
