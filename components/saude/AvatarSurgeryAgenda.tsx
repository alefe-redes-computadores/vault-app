import Link from 'next/link';
import { surgeryBodyLabel } from '@/lib/surgery-body';
import type { Cirurgia } from '@/lib/types';
import type { AvatarBodyContext } from '@/lib/health-profile/avatar-body';
import { surgeryTime } from '@/lib/health-profile/avatar-surgeries';
import { surgeriesForMarker } from '@/lib/health-profile/avatar-surgery-markers';

const formatDate = (value: string) => value.split('-').reverse().join('/');

function SurgeryGroup({ title, rows, status, today }: {
  title: string; rows: Cirurgia[]; status: string; today: string;
}) {
  if (!rows.length) return null;
  return <section className="space-y-2" aria-label={title}>
    <h3 className="text-xs font-semibold text-ink-primary">{title} · {rows.length}</h3>
    <ul className="space-y-2">
      {rows.slice(0, 3).map((surgery, index) => {
        const content = <>
          <span className="block break-words font-medium">{surgery.procedimento || 'Procedimento registrado'}</span>
          {surgeryBodyLabel(surgery) ? <span className="mt-1 block text-rose-200">{surgeryBodyLabel(surgery)}</span> : null}
          <span className="mt-1 block text-ink-muted">
            {formatDate(surgery.data)}{surgeryTime(surgery.horario) ? ` às ${surgeryTime(surgery.horario)}` : ''}
            {' · '}{surgery.status === 'agendada' && surgery.data === today ? 'agendada para hoje' : status}
          </span>
        </>;
        return <li key={surgery.id || `${surgery.data}-${index}`}>
          {surgery.id ? <Link className="block min-h-11 rounded-xl border border-surface-border p-3 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300" href={`/saude/cirurgias/detalhes?id=${encodeURIComponent(surgery.id)}`}>
            {content}<span className="mt-2 block text-rose-300">Abrir registro ›</span>
          </Link> : <div className="rounded-xl border border-surface-border p-3 text-xs">{content}</div>}
        </li>;
      })}
    </ul>
    {rows.length > 3 ? <p className="text-xs text-ink-muted">Mostrando 3 de {rows.length}. A lista completa está em Cirurgias.</p> : null}
  </section>;
}

export function AvatarSurgeryAgenda({ context, markerKey, onShowAll }: { context: AvatarBodyContext; markerKey?: string | null; onShowAll?: () => void }) {
  const marker = context.surgeryMarkers.find(item => item.key === markerKey);
  const { upcoming, unconfirmed, completed, total } = markerKey ? surgeriesForMarker(context.surgeryAgenda, marker) : context.surgeryAgenda;
  return <div className="mt-3 space-y-4">
    {markerKey ? <div className="rounded-xl border border-rose-400/25 bg-rose-400/5 p-3"><h3 className="text-sm font-semibold text-rose-200">{marker?.label || 'Marcação indisponível'}</h3><p className="mt-1 text-xs text-ink-muted">{marker ? 'Registros vinculados a esta região informada. A marca é esquemática.' : 'O registro pode ter sido alterado ou removido. Consulte todas as regiões.'}</p>{onShowAll ? <button type="button" onClick={onShowAll} className="mt-2 min-h-11 text-xs text-rose-300">Ver todas as regiões ›</button> : null}</div> : null}
    <p className="text-xs leading-relaxed text-ink-muted">Um agendamento não confirma cirurgia realizada nem uso de tala. Abra o registro para conferir ou atualizar o status.</p>
    {unconfirmed.length ? <section className="space-y-2 rounded-xl border border-amber-400/25 bg-amber-400/5 p-3">
      <p className="text-xs leading-relaxed text-amber-200">A data agendada já passou em {unconfirmed.length} {unconfirmed.length === 1 ? 'registro' : 'registros'}. O status continua agendada; confira o que aconteceu.</p>
      <SurgeryGroup title="Conferir status" rows={unconfirmed} status="agendada · data passada" today={context.today} />
    </section> : null}
    <SurgeryGroup title="Próximas cirurgias" rows={upcoming} status="agendada" today={context.today} />
    <SurgeryGroup title="Realizadas nos últimos 90 dias" rows={completed} status="realizada" today={context.today} />
    {!total ? <p className="text-xs text-ink-muted">Nenhuma cirurgia agendada ou realizada nos últimos 90 dias neste contexto. O histórico completo continua em Cirurgias.</p> : null}
    <p className="text-[11px] leading-relaxed text-ink-muted">A representação de tala depende do equipamento ativo e do lado informado. Uma cirurgia marcada como realizada não informa, sozinha, a recuperação atual.</p>
    <Link className="block min-h-11 rounded-xl bg-rose-400/10 p-3 text-xs text-rose-300" href="/saude/cirurgias">Ver todas as cirurgias ›</Link>
  </div>;
}
