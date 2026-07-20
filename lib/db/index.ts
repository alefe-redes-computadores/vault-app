// ============================================================
// VERSÃO 6 - CORRIGE ÍNDICE user_id EM documents E MIGRA DADOS
// ============================================================
this.version(6).stores({
  persons: '++id, user_id, name, synced, created_at',
  documents: '++id, user_id, person_id, category_id, type, title, is_favorite, synced, created_at, vault_id',
  syncQueue: '++id, table, operation, created_at, user_id',
  medicamentos: '++id, document_id, nome, medico, proxima_renovacao',
  renovacoes: '++id, medicamento_id, data',
  vaults: '++id, user_id, name, synced, created_at',
  vaultMembers: '++id, vault_id, user_id, email, status, synced',
  medicos: '++id, user_id, nome, especialidade, synced',
  farmacias: '++id, user_id, nome, synced',
  hospitais: '++id, user_id, nome, synced',
}).upgrade(async (tx) => {
  console.log('🔄 Migrando para versão 6: preenchendo user_id em documents...');
  
  // Buscar todos os documentos
  const documents = await tx.table('documents').toArray();
  const persons = await tx.table('persons').toArray();
  
  // Criar um mapa de person_id -> user_id
  const personUserMap: Record<number, string> = {};
  persons.forEach(p => {
    if (p.id && p.user_id) {
      personUserMap[p.id] = p.user_id;
    }
  });
  
  // Atualizar cada documento com o user_id da pessoa
  for (const doc of documents) {
    if (!doc.user_id && doc.person_id && personUserMap[doc.person_id]) {
      await tx.table('documents').update(doc.id, { user_id: personUserMap[doc.person_id] });
    }
  }
  
  console.log('✅ Migração concluída!');
});