import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const ok = (value, message) => { if (!value) throw new Error(`V78: ${message}`); console.log(`OK: ${message}`); };

const detail = read('app/saude/medicamentos/detalhes/page.tsx');
const today = read('app/hoje/page.tsx');
const avatar = read('components/ui/AvatarMedicamento.tsx');
const health = read('lib/health-insights.ts');

ok(detail.includes('MedicationFormatIcon formato={med.formato} cores={med.cores}'), 'detalhes usam o ícone canônico do medicamento');
ok(!detail.includes('<SelectedFormatIcon'), 'renderização divergente foi removida dos detalhes');
ok(detail.includes('VAULT_MEDICATION_DETAIL_DIRECT_NAVIGATION_V92_3'), 'detalhes usam navegação direta canônica');
ok(detail.includes('router.push(') && !detail.includes('navigateReliably') && !detail.includes('window.location.assign(nativePath)'), 'detalhes navegam diretamente sem helper ou reload nativo');
ok(today.includes('item.insight?.deveRenovar === true'), 'Hoje respeita a decisão inteligente de renovação');
ok(today.includes('Renovar agora') && today.includes('Renovar em'), 'prazo de renovação tem contexto explícito');
ok(!/\{\s*item\.diasRestantes\s*\}\s*\{" "\}\s*dias/.test(today), 'Hoje não mostra dias soltos');
ok(avatar.includes('MedicationFormatIcon'), 'avatar compartilhado usa formato canônico');
ok(/entidadeIds\?:\s*\n\s*string\[\];/.test(health), 'HealthInsight preserva múltiplas entidades');

console.log('V78 FINAL CLOSURE — CONTRATO OK');
