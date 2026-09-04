// lib/repositories/documents.ts

import {
  db,
} from "@/lib/db";

import {
  enfileirarOperacao,
  solicitarProcessamentoSync,
} from "@/lib/sync/enfileirarOperacao";

import {
  supabase,
} from "@/lib/supabase/client";

import {
  deleteFile,
} from "@/lib/supabase/storage";

import {
  cancelDocumentExpiryNotification,
  scheduleDocumentExpiryNotification,
} from "@/lib/notifications";

import {
  CATEGORIES,
} from "@/lib/types";

import type {
  Document,
  Medicamento,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type CreateDocumentInput =
  Omit<
    Document,
    | "id"
    | "user_id"
    | "person_id"
    | "created_at"
    | "updated_at"
    | "synced"
  > & {
    id?: string;
    person_id: string;
  };

type UpdateDocumentBase =
  Partial<
    Omit<
      Document,
      | "id"
      | "user_id"
      | "person_id"
      | "created_at"
      | "updated_at"
      | "synced"
      | "description"
      | "medico_id"
      | "hospital_id"
      | "entidade_tipo"
      | "entidade_id"
    >
  >;

/*
 * Semântica dos campos anuláveis:
 *
 * undefined = campo não participou da alteração
 * null      = limpar explicitamente
 * string    = definir/atualizar
 *
 * Essa distinção é necessária para o sync remoto não
 * ressuscitar valores que o usuário removeu localmente.
 */
type UpdateDocumentInput =
  UpdateDocumentBase & {
    description?:
      | string
      | null;

    medico_id?:
      | string
      | null;

    hospital_id?:
      | string
      | null;

    entidade_tipo?:
      | string
      | null;

    entidade_id?:
      | string
      | null;
  };

type HealthEntityType =
  | "medicamento"
  | "tratamento"
  | "cid"
  | "consulta"
  | "exame"
  | "cirurgia"
  | "registro_saude"
  | "renovacao";

interface EntityReference {
  entidade_tipo?:
    | string
    | null;

  entidade_id?:
    | string
    | null;
}

// ============================================================
// CONSTANTES
// ============================================================

const ATTACHMENTS_BUCKET =
  "vault-attachments";

const PUBLIC_STORAGE_MARKER =
  "/storage/v1/object/public/";

// ============================================================
// HELPERS
// ============================================================

function requirePersonId(
  personId?: string
): string {
  const normalized =
    personId?.trim();

  if (
    !normalized
  ) {
    throw new Error(
      "Pessoa ativa não identificada."
    );
  }

  return normalized;
}

function requireDocumentId(
  id?: string
): string {
  const normalized =
    id?.trim();

  if (
    !normalized
  ) {
    throw new Error(
      "Documento não identificado."
    );
  }

  return normalized;
}

function generateId(): string {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function normalizeOptionalId(
  value?:
    | string
    | null
): string | undefined {
  const normalized =
    value?.trim();

  return normalized ||
    undefined;
}

function normalizeOptionalText(
  value?:
    | string
    | null
): string | undefined {
  const normalized =
    value?.trim();

  return normalized ||
    undefined;
}

function isHealthEntityType(
  value?: string
): value is HealthEntityType {
  return [
    "medicamento",
    "tratamento",
    "cid",
    "consulta",
    "exame",
    "cirurgia",
    "registro_saude",
    "renovacao",
  ].includes(
    value ||
      ""
  );
}

function hasOwn(
  object:
    object,
  key:
    PropertyKey
): boolean {
  return Object.prototype.hasOwnProperty.call(
    object,
    key
  );
}

// ============================================================
// AUTH
// ============================================================

async function getAuthenticatedUserId(): Promise<string> {
  const {
    data: {
      user,
    },
    error,
  } =
    await supabase.auth.getUser();

  if (
    error
  ) {
    throw error;
  }

  if (
    !user
  ) {
    throw new Error(
      "Usuário não autenticado."
    );
  }

  return user.id;
}

// ============================================================
// OWNERSHIP
// ============================================================

async function getDocumentForPerson(
  id: string,
  personId: string
): Promise<Document> {
  const document =
    await db.documents.get(
      id
    );

  if (
    !document ||
    document.person_id !==
      personId
  ) {
    throw new Error(
      "Documento não encontrado para a pessoa ativa."
    );
  }

  return document;
}

// ============================================================
// GLOBAL RELATIONS
// ============================================================

async function validateGlobalRelations(
  medicoId?: string,
  hospitalId?: string
): Promise<void> {
  if (
    medicoId
  ) {
    const medico =
      await db.medicos.get(
        medicoId
      );

    if (
      !medico
    ) {
      throw new Error(
        "Médico vinculado ao documento não foi encontrado."
      );
    }
  }

  if (
    hospitalId
  ) {
    const hospital =
      await db.hospitais.get(
        hospitalId
      );

    if (
      !hospital
    ) {
      throw new Error(
        "Hospital vinculado ao documento não foi encontrado."
      );
    }
  }
}

// ============================================================
// CANONICAL HEALTH RELATION
// ============================================================

async function validateHealthEntityReference(
  reference:
    EntityReference,
  personId:
    string
): Promise<void> {
  const entidadeTipo =
    normalizeOptionalId(
      reference.entidade_tipo
    );

  const entidadeId =
    normalizeOptionalId(
      reference.entidade_id
    );

  if (
    !entidadeTipo &&
    !entidadeId
  ) {
    return;
  }

  if (
    !entidadeTipo ||
    !entidadeId
  ) {
    throw new Error(
      "O vínculo clínico do documento está incompleto."
    );
  }

  if (
    !isHealthEntityType(
      entidadeTipo
    )
  ) {
    throw new Error(
      "Tipo de vínculo clínico não suportado."
    );
  }

  let entity:
    | {
        person_id?: string;
      }
    | undefined;

  switch (
    entidadeTipo
  ) {
    case "medicamento":
      entity =
        await db.medicamentos.get(
          entidadeId
        );
      break;

    case "tratamento":
      entity =
        await db.tratamentos.get(
          entidadeId
        );
      break;

    case "cid":
      entity =
        await db.cids.get(
          entidadeId
        );
      break;

    case "consulta":
      entity =
        await db.consultas.get(
          entidadeId
        );
      break;

    case "exame":
      entity =
        await db.exames.get(
          entidadeId
        );
      break;

    case "cirurgia":
      entity =
        await db.cirurgias.get(
          entidadeId
        );
      break;

    case "registro_saude":
      entity =
        await db.registros_saude.get(
          entidadeId
        );
      break;

    case "renovacao":
      entity =
        await db.renovacoes.get(
          entidadeId
        );
      break;
  }

  if (
    !entity ||
    entity.person_id !==
      personId
  ) {
    throw new Error(
      "A entidade clínica vinculada ao documento não pertence à pessoa ativa."
    );
  }
}

// ============================================================
// RECEITA CANÔNICA DO MEDICAMENTO
// ============================================================

function getMetadataDate(
  metadata: Document["metadata"],
  key: string
): string {
  const value =
    metadata?.[key];

  return typeof value === "string"
    ? value.trim()
    : "";
}

function isMedicationPrescription(
  document: Pick<
    Document,
    | "category_id"
    | "type"
    | "entidade_tipo"
    | "entidade_id"
  >
): document is typeof document & {
  entidade_tipo: "medicamento";
  entidade_id: string;
} {
  return (
    document.category_id === "saude" &&
    document.type === "receita" &&
    document.entidade_tipo === "medicamento" &&
    Boolean(document.entidade_id)
  );
}

async function buildMedicationFromPrescription(
  document: Document,
  personId: string,
  now: string
): Promise<Medicamento | null> {
  if (
    !isMedicationPrescription(
      document
    )
  ) {
    return null;
  }

  const medicamento =
    await db.medicamentos.get(
      document.entidade_id
    );

  if (
    !medicamento ||
    medicamento.person_id !== personId
  ) {
    throw new Error(
      "O medicamento vinculado à receita não pertence à pessoa ativa."
    );
  }

  const dataReceita =
    getMetadataDate(
      document.metadata,
      "prescription_date"
    );

  const proximaRenovacao =
    getMetadataDate(
      document.metadata,
      "renewal_date"
    );

  return {
    ...medicamento,
    document_id: document.id,
    data_receita:
      dataReceita ||
      medicamento.data_receita ||
      "",
    proxima_renovacao:
      proximaRenovacao ||
      medicamento.proxima_renovacao ||
      "",
    updated_at: now,
    synced: false,
  };
}

async function reconcileDocumentExpiryNotification(
  document: Document
): Promise<void> {
  const documentId =
    document.id?.trim();

  if (
    !documentId
  ) {
    return;
  }

  try {
    const metadata =
      document.metadata || {};

    /*
     * Em Saúde, apenas Receita usa alerta documental.
     * renewal_date continua sendo próxima renovação e nunca
     * deve ser confundida com validade.
     */
    const isHealthPrescription =
      document.category_id ===
        "saude" &&
      document.type ===
        "receita";

    const isPersonalDocument =
      document.category_id !==
        "saude";

    const candidates =
      isHealthPrescription
        ? [
            metadata.expiry_date,
            metadata.expiration_date,
            metadata.validade,
          ]
        : isPersonalDocument
          ? [
              metadata.expiry_date,
              metadata.data_validade,
              metadata.validade,
            ]
          : [];

    const expiryDate =
      candidates.find(
        (
          value
        ) =>
          typeof value ===
            "string" &&
          value.trim().length >
            0
      );

    /*
     * Sem validade real, qualquer agendamento anterior deve
     * ser removido.
     */
    if (
      typeof expiryDate !==
        "string"
    ) {
      await cancelDocumentExpiryNotification(
        documentId
      );

      return;
    }

    await scheduleDocumentExpiryNotification(
      documentId,
      document.title,
      expiryDate.trim(),
      CATEGORIES[
        document.category_id
      ]?.name ||
        "Documento",
      isHealthPrescription
        ? 7
        : 30
    );
  } catch (
    error
  ) {
    /*
     * Uma falha do Android não desfaz o documento já salvo.
     */
    console.error(
      "[documentsRepository] Documento salvo, mas houve falha ao reconciliar sua notificação:",
      error
    );
  }
}

// ============================================================
// STORAGE
// ============================================================

function isVaultAttachmentUrl(
  url?: string
): boolean {
  if (
    !url ||
    url.startsWith(
      "blob:"
    )
  ) {
    return false;
  }

  /*
   * uploadFile() gera URL pública do bucket:
   *
   * /storage/v1/object/public/vault-attachments/...
   */
  return url.includes(
    `${PUBLIC_STORAGE_MARKER}${ATTACHMENTS_BUCKET}/`
  );
}

function getRemovedStorageUrls(
  previous:
    Document["attachments"],
  next:
    Document["attachments"]
): string[] {
  const nextUrls =
    new Set(
      (
        next ||
        []
      )
        .map(
          (
            attachment
          ) =>
            attachment.url
        )
        .filter(
          Boolean
        )
    );

  return Array.from(
    new Set(
      (
        previous ||
        []
      )
        .map(
          (
            attachment
          ) =>
            attachment.url
        )
        .filter(
          (
            url
          ): url is string =>
            isVaultAttachmentUrl(
              url
            ) &&
            !nextUrls.has(
              url
            )
        )
    )
  );
}

async function cleanupStorageUrls(
  urls:
    string[]
): Promise<void> {
  const uniqueUrls =
    Array.from(
      new Set(
        urls.filter(
          isVaultAttachmentUrl
        )
      )
    );

  for (
    const url of
    uniqueUrls
  ) {
    try {
      /*
       * deleteFile() NÃO lança necessariamente.
       * O contrato real devolve { error }.
       */
      const {
        error,
      } =
        await deleteFile(
          url
        );

      if (
        error
      ) {
        console.error(
          "[documentsRepository] Falha ao limpar arquivo do Storage:",
          url,
          error
        );
      }
    } catch (
      error
    ) {
      /*
       * Defesa adicional caso o implementation mude no futuro.
       *
       * Uma falha física de Storage nunca desfaz um commit
       * clínico já concluído localmente.
       */
      console.error(
        "[documentsRepository] Erro inesperado ao limpar arquivo do Storage:",
        url,
        error
      );
    }
  }
}

// ============================================================
// REPOSITORY
// ============================================================

export const documentsRepository = {
  // ==========================================================
  // LIST
  // ==========================================================

  async getAll(
    personId: string
  ): Promise<Document[]> {
    const safePersonId =
      requirePersonId(
        personId
      );

    const documents =
      await db.documents
        .where(
          "person_id"
        )
        .equals(
          safePersonId
        )
        .toArray();

    return documents.sort(
      (
        a,
        b
      ) =>
        String(
          b.created_at ||
            ""
        ).localeCompare(
          String(
            a.created_at ||
              ""
          )
        )
    );
  },

  // ==========================================================
  // GET
  // ==========================================================

  async getById(
    id: string,
    personId: string
  ): Promise<Document | undefined> {
    const safeId =
      requireDocumentId(
        id
      );

    const safePersonId =
      requirePersonId(
        personId
      );

    const document =
      await db.documents.get(
        safeId
      );

    if (
      !document ||
      document.person_id !==
        safePersonId
    ) {
      return undefined;
    }

    return document;
  },

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(
    data:
      CreateDocumentInput
  ): Promise<string> {
    const personId =
      requirePersonId(
        data.person_id
      );

    const userId =
      await getAuthenticatedUserId();

    const medicoId =
      normalizeOptionalId(
        data.medico_id
      );

    const hospitalId =
      normalizeOptionalId(
        data.hospital_id
      );

    const entidadeTipo =
      normalizeOptionalId(
        data.entidade_tipo
      );

    const entidadeId =
      normalizeOptionalId(
        data.entidade_id
      );

    await Promise.all([
      validateGlobalRelations(
        medicoId,
        hospitalId
      ),

      data.category_id ===
      "saude"
        ? validateHealthEntityReference(
            {
              entidade_tipo:
                entidadeTipo,

              entidade_id:
                entidadeId,
            },
            personId
          )
        : Promise.resolve(),
    ]);

    const now =
      new Date().toISOString();

    const docId =
      data.id?.trim() ||
      generateId();

    const {
      id:
        _ignoredId,

      person_id:
        _ignoredPersonId,

      ...documentData
    } =
      data;

    const document:
      Document = {
        ...documentData,

        id:
          docId,

        user_id:
          userId,

        person_id:
          personId,

        description:
          normalizeOptionalText(
            data.description
          ),

        medico_id:
          medicoId,

        hospital_id:
          hospitalId,

        entidade_tipo:
          entidadeTipo,

        entidade_id:
          entidadeId,

        created_at:
          now,

        updated_at:
          now,

        synced:
          false,
      };

    /*
     * Uma nova Receita vinculada canonicamente a um medicamento
     * passa a ser a receita atual dele. O histórico documental
     * permanece intacto; somente o ponteiro e as datas correntes
     * do medicamento são promovidos atomicamente.
     */
    const medicamentoAtualizado =
      await buildMedicationFromPrescription(
        document,
        personId,
        now
      );

    await db.transaction(
      "rw",
      [
        db.documents,
        db.medicamentos,
        db.syncQueue,
      ],
      async () => {
        await db.documents.add(
          document
        );

        await enfileirarOperacao(
          "documents",
          "add",
          document,
          {
            dispatchSync:
              false,
          }
        );

        if (
          medicamentoAtualizado
        ) {
          await db.medicamentos.put(
            medicamentoAtualizado
          );

          await enfileirarOperacao(
            "medicamentos",
            "update",
            medicamentoAtualizado,
            {
              dispatchSync:
                false,
            }
          );
        }
      }
    );

    solicitarProcessamentoSync();

    await reconcileDocumentExpiryNotification(
      document
    );

    return docId;
  },

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(
    id: string,
    personId: string,
    data:
      UpdateDocumentInput
  ): Promise<string> {
    const safeId =
      requireDocumentId(
        id
      );

    const safePersonId =
      requirePersonId(
        personId
      );

    const userId =
      await getAuthenticatedUserId();

    const existing =
      await getDocumentForPerson(
        safeId,
        safePersonId
      );

    if (
      existing.user_id &&
      existing.user_id !==
        userId
    ) {
      throw new Error(
        "Documento não pertence ao usuário autenticado."
      );
    }

    // ========================================================
    // TARGET CATEGORY
    // ========================================================

    const targetCategory =
      data.category_id ??
      existing.category_id;

    // ========================================================
    // DESCRIPTION
    //
    // undefined = não alterar
    // null      = limpar
    // string    = definir
    // ========================================================

    const description =
      hasOwn(
        data,
        "description"
      )
        ? normalizeOptionalText(
            data.description
          )
        : existing.description;

    // ========================================================
    // OPTIONAL GLOBAL RELATIONS
    // ========================================================

    const medicoId =
      hasOwn(
        data,
        "medico_id"
      )
        ? normalizeOptionalId(
            data.medico_id
          )
        : existing.medico_id;

    const hospitalId =
      hasOwn(
        data,
        "hospital_id"
      )
        ? normalizeOptionalId(
            data.hospital_id
          )
        : existing.hospital_id;

    // ========================================================
    // CANONICAL RELATION
    // ========================================================

    const entidadeTipo =
      hasOwn(
        data,
        "entidade_tipo"
      )
        ? normalizeOptionalId(
            data.entidade_tipo
          )
        : existing.entidade_tipo;

    const entidadeId =
      hasOwn(
        data,
        "entidade_id"
      )
        ? normalizeOptionalId(
            data.entidade_id
          )
        : existing.entidade_id;

    await Promise.all([
      validateGlobalRelations(
        medicoId,
        hospitalId
      ),

      targetCategory ===
      "saude"
        ? validateHealthEntityReference(
            {
              entidade_tipo:
                entidadeTipo,

              entidade_id:
                entidadeId,
            },
            safePersonId
          )
        : Promise.resolve(),
    ]);

    // ========================================================
    // ATTACHMENTS
    // ========================================================

    const nextAttachments =
      hasOwn(
        data,
        "attachments"
      )
        ? data.attachments ||
          []
        : existing.attachments ||
          [];

    const removedStorageUrls =
      getRemovedStorageUrls(
        existing.attachments ||
          [],
        nextAttachments
      );

    // ========================================================
    // PAYLOAD
    // ========================================================

    const now =
      new Date().toISOString();

    const rawPayload:
      Record<
        string,
        unknown
      > = {
        ...data,

        updated_at:
          now,

        synced:
          false,
      };

    /*
     * Para todos os campos com semântica explícita de limpeza,
     * mantemos null no payload local/sync.
     */

    if (
      hasOwn(
        data,
        "description"
      )
    ) {
      rawPayload.description =
        description ??
        null;
    }

    if (
      hasOwn(
        data,
        "medico_id"
      )
    ) {
      rawPayload.medico_id =
        medicoId ??
        null;
    }

    if (
      hasOwn(
        data,
        "hospital_id"
      )
    ) {
      rawPayload.hospital_id =
        hospitalId ??
        null;
    }

    if (
      hasOwn(
        data,
        "entidade_tipo"
      )
    ) {
      rawPayload.entidade_tipo =
        entidadeTipo ??
        null;
    }

    if (
      hasOwn(
        data,
        "entidade_id"
      )
    ) {
      rawPayload.entidade_id =
        entidadeId ??
        null;
    }

    delete rawPayload.id;
    delete rawPayload.user_id;
    delete rawPayload.person_id;
    delete rawPayload.created_at;

    /*
     * undefined nunca deve chegar ao Dexie/sync.
     * null deve permanecer intacto.
     */
    const payload =
      Object.fromEntries(
        Object.entries(
          rawPayload
        ).filter(
          (
            [
              ,
              value,
            ]
          ) =>
            value !==
            undefined
        )
      ) as unknown as
        Partial<Document>;

    await db.transaction(
      "rw",
      [
        db.documents,
        db.syncQueue,
      ],
      async () => {
        const updated =
          await db.documents.update(
            safeId,
            payload
          );

        if (
          updated ===
          0
        ) {
          throw new Error(
            "Não foi possível atualizar o documento."
          );
        }

        const updatedDocument =
          await db.documents.get(
            safeId
          );

        if (
          !updatedDocument ||
          updatedDocument.person_id !==
            safePersonId
        ) {
          throw new Error(
            "Falha ao reler o documento atualizado."
          );
        }

        await enfileirarOperacao(
          "documents",
          "update",
          updatedDocument,
          {
            dispatchSync:
              false,
          }
        );
      }
    );

    solicitarProcessamentoSync();

    const persistedDocument =
      await getDocumentForPerson(
        safeId,
        safePersonId
      );

    await reconcileDocumentExpiryNotification(
      persistedDocument
    );

    /*
     * Limpeza física somente DEPOIS do commit local.
     *
     * Assim:
     * - falha no Dexie => arquivo continua existindo;
     * - commit local OK + falha no Storage => no máximo sobra
     *   arquivo órfão, nunca documento apontando para arquivo
     *   apagado.
     */
    if (
      removedStorageUrls.length >
      0
    ) {
      await cleanupStorageUrls(
        removedStorageUrls
      );
    }

    return safeId;
  },

  // ==========================================================
  // DELETE
  // ==========================================================

  async delete(
    id: string,
    personId: string
  ): Promise<string> {
    const safeId =
      requireDocumentId(
        id
      );

    const safePersonId =
      requirePersonId(
        personId
      );

    const userId =
      await getAuthenticatedUserId();

    const document =
      await getDocumentForPerson(
        safeId,
        safePersonId
      );

    if (
      document.user_id &&
      document.user_id !==
        userId
    ) {
      throw new Error(
        "Documento não pertence ao usuário autenticado."
      );
    }

    /*
     * Guardamos as URLs antes de excluir o registro.
     */
    const storageUrls =
      Array.from(
        new Set(
          (
            document.attachments ||
            []
          )
            .map(
              (
                attachment
              ) =>
                attachment.url
            )
            .filter(
              (
                url
              ): url is string =>
                isVaultAttachmentUrl(
                  url
                )
            )
        )
      );

    await db.transaction(
      "rw",
      [
        db.documents,
        db.syncQueue,
      ],
      async () => {
        const current =
          await db.documents.get(
            safeId
          );

        if (
          !current ||
          current.person_id !==
            safePersonId
        ) {
          throw new Error(
            "Documento não encontrado para a pessoa ativa."
          );
        }

        await db.documents.delete(
          safeId
        );

        await enfileirarOperacao(
          "documents",
          "delete",
          {
            id:
              safeId,

            user_id:
              userId,

            person_id:
              safePersonId,
          },
          {
            dispatchSync:
              false,
          }
        );
      }
    );

    solicitarProcessamentoSync();

    /*
     * O documento já não existe localmente. Seu lembrete
     * também precisa desaparecer do Android.
     */
    await cancelDocumentExpiryNotification(
      safeId
    );

    /*
     * Storage é best-effort e pós-commit.
     */
    if (
      storageUrls.length >
      0
    ) {
      await cleanupStorageUrls(
        storageUrls
      );
    }

    return safeId;
  },

  // ==========================================================
  // FAVORITE
  // ==========================================================

  async favorite(
    id: string,
    personId: string
  ): Promise<string> {
    const safeId =
      requireDocumentId(
        id
      );

    const safePersonId =
      requirePersonId(
        personId
      );

    const userId =
      await getAuthenticatedUserId();

    const document =
      await getDocumentForPerson(
        safeId,
        safePersonId
      );

    if (
      document.user_id &&
      document.user_id !==
        userId
    ) {
      throw new Error(
        "Documento não pertence ao usuário autenticado."
      );
    }

    const now =
      new Date().toISOString();

    await db.transaction(
      "rw",
      [
        db.documents,
        db.syncQueue,
      ],
      async () => {
        const updated =
          await db.documents.update(
            safeId,
            {
              is_favorite:
                !document.is_favorite,

              updated_at:
                now,

              synced:
                false,
            }
          );

        if (
          updated ===
          0
        ) {
          throw new Error(
            "Não foi possível atualizar o documento."
          );
        }

        const updatedDocument =
          await db.documents.get(
            safeId
          );

        if (
          !updatedDocument ||
          updatedDocument.person_id !==
            safePersonId
        ) {
          throw new Error(
            "Falha ao reler o documento atualizado."
          );
        }

        await enfileirarOperacao(
          "documents",
          "update",
          updatedDocument,
          {
            dispatchSync:
              false,
          }
        );
      }
    );

    solicitarProcessamentoSync();

    return safeId;
  },
};