export type TodayAppointmentFilter = "todos" | "consultas" | "cirurgias" | "exames" | "retiradas";

type Entity = Record<string, any>;
type AppointmentProjection = Entity & { tipo: string };

export function buildTodayAppointmentProjection(input: {
  consultas: Entity[];
  cirurgias: Entity[];
  exames: Entity[];
  retiradas: Entity[];
  filter: TodayAppointmentFilter;
}) {
  const groups: Array<[TodayAppointmentFilter, string, Entity[]]> = [
    ["consultas", "consulta", input.consultas],
    ["cirurgias", "cirurgia", input.cirurgias],
    ["exames", "exame", input.exames],
    ["retiradas", "retirada", input.retiradas],
  ];
  const result: AppointmentProjection[] = groups.flatMap(([filter, tipo, items]) => input.filter === "todos" || input.filter === filter
    ? items.map(item => ({ ...item, tipo } as AppointmentProjection))
    : []);
  return result.sort((a, b) => (a.horario || "00:00").localeCompare(b.horario || "00:00"));
}
