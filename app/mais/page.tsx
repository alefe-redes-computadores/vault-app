const clearLocalData = async () => {
  setIsLoading(true);
  try {
    // ✅ CORRIGIDO: Dexie não tem db.delete()
    // Método correto: limpar todas as tabelas
    await db.transaction('rw', 
      db.persons, 
      db.documents, 
      db.medicamentos, 
      db.renovacoes, 
      db.vaults, 
      db.vaultMembers, 
      db.medicos, 
      db.farmacias, 
      db.hospitais, 
      db.syncQueue, 
      async () => {
        await db.persons.clear();
        await db.documents.clear();
        await db.medicamentos.clear();
        await db.renovacoes.clear();
        await db.vaults.clear();
        await db.vaultMembers.clear();
        await db.medicos.clear();
        await db.farmacias.clear();
        await db.hospitais.clear();
        await db.syncQueue.clear();
      }
    );
    trigger("success");
    showToast("Dados locais limpos com sucesso!", "success");
    router.push("/login");
  } catch (error) {
    console.error("Erro ao limpar dados:", error);
    showToast("Erro ao limpar dados", "error");
  } finally {
    setIsLoading(false);
    setShowClearDataModal(false);
  }
};