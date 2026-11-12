/**
 * M129 — catálogo CURADO de nomes para facilitar o registro voluntário.
 * Não é um registro sanitário, lista exaustiva ou autorização de substituição.
 * Cores são aproximações para UX no modo escuro — não são logos oficiais.
 */
export type KnownManufacturerM129 = Readonly<{
  label: string;
  color: string;
  aliases?: readonly string[];
}>;

export const MANUFACTURERS_M129: readonly KnownManufacturerM129[] = [
  { label: 'EMS', color: '#72B6EA', aliases: ['E M S', 'EMS Pharma'] },
  { label: 'Eurofarma', color: '#EBA66D', aliases: ['Eurofarma Laboratórios'] },
  { label: 'Medley', color: '#74C9D4', aliases: ['Medley Farmacêutica'] },
  { label: 'Germed', color: '#74C5B6', aliases: ['Germed Pharma'] },
  { label: 'Neo Química', color: '#F1C66A', aliases: ['Neo Quimica', 'Neoquímica'] },
  { label: 'Aché', color: '#76C3A1', aliases: ['Ache', 'Aché Laboratórios'] },
  { label: 'Geolab', color: '#88D7A6', aliases: ['Geolab Indústria Farmacêutica'] },
  { label: 'Cimed', color: '#F2D273', aliases: ['Grupo Cimed'] },
  { label: 'Torrent', color: '#79CBB6', aliases: ['Torrent Pharma', 'Torrent do Brasil'] },
  { label: 'Althaia', color: '#B99BEA', aliases: ['Althaia Farmacêutica'] },
  { label: 'Prati-Donaduzzi', color: '#78C3AD', aliases: ['Prati Donaduzzi', 'Prati'] },
  { label: 'Teuto', color: '#8BBFF1', aliases: ['Laboratório Teuto', 'Teuto Brasileiro'] },
  { label: 'União Química', color: '#9EC4EA', aliases: ['Uniao Quimica', 'União Química Farmacêutica'] },
  { label: 'Cristália', color: '#B1CBEE', aliases: ['Cristalia', 'Cristália Produtos Químicos'] },
  { label: 'Sandoz', color: '#85B5F0', aliases: ['Sandoz do Brasil'] },
  { label: 'Biolab', color: '#B9D681', aliases: ['Biolab Sanus'] },
  { label: 'Legrand', color: '#A4D7C3', aliases: ['Legrand Pharma'] },
  { label: 'Libbs', color: '#86CCB5', aliases: ['Libbs Farmacêutica'] },
  { label: 'Hypera', color: '#D3ABEA', aliases: ['Hypera Pharma'] },
  { label: 'Sanofi', color: '#B7AAE9', aliases: ['Sanofi Aventis', 'Sanofi-Aventis'] },
  { label: 'Novartis', color: '#9EB9EA', aliases: ['Novartis Biociências'] },
  { label: 'Pfizer', color: '#83B8E9', aliases: ['Pfizer Brasil'] },
  { label: 'Blau', color: '#8ACBEA', aliases: ['Blau Farmacêutica', 'Blausiegel'] },
  { label: 'Multilab', color: '#AED59C', aliases: ['Multilab Indústria'] },
  { label: 'Nova Química', color: '#A1CDEA', aliases: ['Nova Quimica'] },
  { label: 'Hipolabor', color: '#B9D69D', aliases: ['Hipolabor Farmacêutica'] },
  { label: 'Cifarma', color: '#E4BC88', aliases: ['Cifarma Científica'] },
  { label: 'Natulab', color: '#A2D59D', aliases: ['Natulab Laboratório'] },
  { label: 'Airela', color: '#A8BDE8', aliases: ['Airela Indústria'] },
  { label: 'Mantecorp', color: '#D7B0DE', aliases: ['Mantecorp Farmasa'] },
  { label: 'Aspen Pharma', color: '#A0D6C3', aliases: ['Aspen', 'Aspen Pharmacare'] },
  { label: 'Farmoquímica', color: '#C6BAEA', aliases: ['Farmoquimica', 'FQM'] },
  { label: 'Apsen', color: '#8FB7E9', aliases: ['Apsen Farmacêutica'] },
  { label: 'Zydus', color: '#B7C5EC', aliases: ['Zydus Brasil'] },
  { label: 'Ranbaxy', color: '#E6BC8C', aliases: ['Ranbaxy Laboratories'] },
  { label: 'Glenmark', color: '#A1D6CB', aliases: ['Glenmark Farmacêutica'] },
  { label: 'Cipla', color: '#8EBBE3', aliases: ['Cipla Brasil'] },
  { label: 'Sun Pharma', color: '#F0C78D', aliases: ['Sun Pharmaceutical'] },
  { label: "Dr. Reddy's", color: '#C6B3ED', aliases: ['Dr Reddys', "Dr Reddy's"] },
  { label: 'Lupin', color: '#D3B1E4', aliases: ['Lupin Pharma'] },
  { label: 'Abbott', color: '#8BC4EB', aliases: ['Abbott Laboratórios'] },
  { label: 'AbbVie', color: '#B7D3A7', aliases: ['Abbvie Brasil'] },
  { label: 'GSK', color: '#F3B77B', aliases: ['GlaxoSmithKline', 'Glaxo Smith Kline'] },
  { label: 'AstraZeneca', color: '#E2B4E9', aliases: ['Astra Zeneca'] },
  { label: 'Bayer', color: '#83C4D6', aliases: ['Bayer S.A.'] },
  { label: 'Boehringer Ingelheim', color: '#82CBA3', aliases: ['Boehringer'] },
  { label: 'Bristol Myers Squibb', color: '#B1A7EA', aliases: ['BMS', 'Bristol-Myers Squibb'] },
  { label: 'Merck', color: '#8DC9BE', aliases: ['Merck S.A.'] },
  { label: 'MSD', color: '#9DD5C4', aliases: ['Merck Sharp & Dohme', 'Merck Sharp Dohme'] },
  { label: 'Organon', color: '#A2D1D0', aliases: ['Organon Brasil'] },
  { label: 'Janssen', color: '#B3C8E8', aliases: ['Janssen-Cilag'] },
  { label: 'Roche', color: '#8FB6E7', aliases: ['Roche Farma'] },
  { label: 'Takeda', color: '#A3CFE2', aliases: ['Takeda Pharma'] },
  { label: 'Daiichi Sankyo', color: '#C5B9ED', aliases: ['Daiichi'] },
  { label: 'Servier', color: '#8AC2E7', aliases: ['Laboratórios Servier'] },
  { label: 'Novo Nordisk', color: '#95BCEB', aliases: ['Novo-Nordisk'] },
  { label: 'Eli Lilly', color: '#E5A7AE', aliases: ['Lilly', 'Lilly do Brasil'] },
  { label: 'Biogen', color: '#B8CAEA', aliases: ['Biogen Brasil'] },
  { label: 'Amgen', color: '#99C3E9', aliases: ['Amgen Brasil'] },
  { label: 'Gilead', color: '#A2D4CE', aliases: ['Gilead Sciences'] },
  { label: 'Gedeon Richter', color: '#A0C1EB', aliases: ['Richter Gedeon'] },
  { label: 'Grünenthal', color: '#86CAA8', aliases: ['Grunenthal'] },
  { label: 'Adium', color: '#E0B7DC', aliases: ['Adium Pharma'] },
  { label: 'Cellera', color: '#94D1C3', aliases: ['Cellera Farma'] },
  { label: 'Laboratório Globo', color: '#A0C3EB', aliases: ['Globo Farmacêutica'] },
  { label: 'Belfar', color: '#B6D3A0', aliases: ['Belfar Indústria Farmacêutica'] },
  { label: 'Farmanguinhos', color: '#B4D9A4', aliases: ['Fiocruz Farmanguinhos'] },
  { label: 'Lafepe', color: '#A5CDE4', aliases: ['Laboratório Farmacêutico do Estado de Pernambuco'] },
  { label: 'FURP', color: '#A2D5CF', aliases: ['Fundação para o Remédio Popular'] },
  { label: 'Instituto Vital Brazil', color: '#B6D6C1', aliases: ['Vital Brazil'] },
  { label: 'Butantan', color: '#99D0BA', aliases: ['Instituto Butantan'] },
  { label: 'Zambon', color: '#A6BDE9', aliases: ['Zambon Farmacêutica'] },
  { label: 'Farmasa', color: '#D9B3C6', aliases: ['Laboratório Farmasa'] },
  { label: 'Nativita', color: '#B9D69A', aliases: ['Nativita Indústria'] },
];

export function manufacturerKeyM129(value?: string | null): string {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

const lookup = new Map<string, KnownManufacturerM129>();
for (const entry of MANUFACTURERS_M129) {
  for (const candidate of [entry.label, ...(entry.aliases || [])]) {
    const key = manufacturerKeyM129(candidate);
    if (lookup.has(key) && lookup.get(key) !== entry) throw new Error(`Alias de laboratório ambíguo: ${candidate}`);
    lookup.set(key, entry);
  }
}

export function recognizedManufacturerM129(value?: string | null): KnownManufacturerM129 | null {
  const key = manufacturerKeyM129(value);
  return key ? lookup.get(key) || null : null;
}

export function manufacturerComparisonKeyM129(value?: string | null): string {
  const recognized = recognizedManufacturerM129(value);
  return recognized ? manufacturerKeyM129(recognized.label) : manufacturerKeyM129(value);
}

export function manufacturerSuggestionsM129(query: string, limit = 7): KnownManufacturerM129[] {
  const needle = manufacturerKeyM129(query);
  const terms = (entry: KnownManufacturerM129) => [entry.label, ...(entry.aliases || [])].map(manufacturerKeyM129);
  const matches = needle
    ? MANUFACTURERS_M129.filter(entry => terms(entry).some(term => term.includes(needle)))
    : MANUFACTURERS_M129.slice(0, 7);
  return [...matches].sort((a, b) => {
    const score = (entry: KnownManufacturerM129) => terms(entry).some(term => term.startsWith(needle)) ? 0 : 1;
    return score(a) - score(b) || a.label.localeCompare(b.label, 'pt-BR');
  }).slice(0, Math.max(0, Math.min(12, limit)));
}
