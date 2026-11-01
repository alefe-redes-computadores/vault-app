/** R9 R8 — pure, read-only Home agenda count. Events remain owned by their original repositories. */
export function countHomeTodayAppointments(groups: {
  consultations: readonly unknown[];
  exams: readonly unknown[];
  surgeries: readonly unknown[];
  withdrawals: readonly unknown[];
}): number {
  return groups.consultations.length + groups.exams.length + groups.surgeries.length + groups.withdrawals.length;
}
