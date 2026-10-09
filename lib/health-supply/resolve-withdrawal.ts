import { db } from "@/lib/db";
import { resolveSupplyWithdrawal } from "./rules";
export async function loadSupplyWithdrawal(
  medId: string,
  pid: string,
  uid: string,
  date: string,
) {
  const [processos, ciclos, itens] = await Promise.all([
    db.fornecimentos.where("person_id").equals(pid).toArray(),
    db.fornecimento_ciclos.where("person_id").equals(pid).toArray(),
    db.fornecimento_itens.where("person_id").equals(pid).toArray(),
  ]);
  return resolveSupplyWithdrawal(
    { processos, ciclos, itens, documentos: [] },
    medId,
    pid,
    uid,
    date,
  );
}
