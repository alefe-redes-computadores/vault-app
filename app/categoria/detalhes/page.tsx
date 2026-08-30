// app/categoria/detalhes/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Building2,
  Camera,
  Check,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Layers3,
  Loader2,
  MapPin,
  Paperclip,
  Pill,
  Save,
  Stethoscope,
  Store,
  Upload,
  UserRound,
  X,
} from "lucide-react";

import { db } from "@/lib/db";
import { uploadFile } from "@/lib/supabase/storage";

import { useAuth } from "@/hooks/useAuth";
import { usePersons } from "@/hooks/usePersons";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";

import {
  CATEGORIES,
  DOCUMENT_FIELDS,
  TYPE_CATEGORY_MAP,
  type Attachment,
  type CategoryId,
  type DocumentField,
  type DocumentType,
  type Person,
} from "@/lib/types";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";

// ============================================================
// TIPOS LOCAIS
// ============================================================

interface SelectItem {
  id: string;
  label: string;
  description?: string;
}

interface FormData {
  person_id: string;
  category_id: CategoryId;
  type: DocumentType;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
  attachments: Attachment[];
}

interface PendingUpload {
  attachmentId: string;
  file: File;
  objectUrl: string;
}

// ============================================================
// LABELS DOS TIPOS
// ============================================================

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  rg: "C.I.N / RG",
  cpf: "CPF",
  cnh: "CNH",
  certidao_nascimento: "Certidão de Nascimento",
  titulo_eleitor: "Título de Eleitor",
  certificado: "Certificado",
  carteira_trabalho: "Carteira de Trabalho",
  passaporte: "Passaporte",
  dispensa_militar: "Dispensa Militar",
  receita: "Receita",
  prontuario: "Prontuário",
  laudo: "Laudo",
  encaminhamento: "Encaminhamento",
  consulta: "Consulta",
  cirurgia: "Cirurgia",
  exame_sangue: "Exame de Sangue",
  exame_imagem: "Exame de Imagem",
  credencial: "Credencial / Carteirinha",
  outro: "Outro",
};

const sectionMotion = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
};

// ============================================================
// HELPERS
// ============================================================

function getMetadataString(
  metadata: Record<string, unknown>,
  key: string
): string {
  const value = metadata[key];

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return "";
}

function belongsToPerson(
  entityPersonId: string | undefined,
  personId: string
): boolean {
  if (!personId) {
    return true;
  }

  /*
   * Registros antigos podem não possuir person_id.
   * Não escondemos esses registros para manter
   * compatibilidade com dados anteriores à v29.
   */
  return (
    !entityPersonId ||
    entityPersonId === personId
  );
}

function migrateLegacyMetadata(
  metadata: Record<string, unknown>,
  type: DocumentType
): Record<string, unknown> {
  const migrated = {
    ...metadata,
  };

  /*
   * Antes da migration v20, exames utilizavam
   * laboratorio_id.
   *
   * A tabela exames foi migrada, mas documentos
   * antigos podem continuar trazendo o ID dentro
   * de metadata.
   */
  if (type === "exame_sangue") {
    const currentLocalId =
      getMetadataString(
        migrated,
        "local_id"
      );

    const legacyLaboratorioId =
      getMetadataString(
        migrated,
        "laboratorio_id"
      );

    if (
      !currentLocalId &&
      legacyLaboratorioId
    ) {
      migrated.local_id =
        legacyLaboratorioId;
    }

    delete migrated.laboratorio_id;
  }

  return migrated;
}

function changeMetadataType(
  metadata: Record<string, unknown>,
  previousType: DocumentType,
  nextType: DocumentType
): Record<string, unknown> {
  if (previousType === nextType) {
    return migrateLegacyMetadata(
      metadata,
      nextType
    );
  }

  const result = {
    ...metadata,
  };

  const previousFields =
    DOCUMENT_FIELDS[previousType];

  const nextFieldKeys = new Set(
    DOCUMENT_FIELDS[nextType].map(
      (field) => field.key
    )
  );

  /*
   * Remove somente metadata pertencente ao tipo
   * anterior e incompatível com o próximo.
   *
   * Metadata adicional, como cid_id e
   * tratamento_id, continua preservado.
   */
  for (const field of previousFields) {
    if (!nextFieldKeys.has(field.key)) {
      delete result[field.key];
    }
  }

  return migrateLegacyMetadata(
    result,
    nextType
  );
}

function hasDocumentField(
  type: DocumentType,
  key: string
): boolean {
  return DOCUMENT_FIELDS[type].some(
    (field) => field.key === key
  );
}

function getFieldIcon(key: string) {
  switch (key) {
    case "medicamento_id":
      return Pill;

    case "medico_id":
    case "from_medico_id":
    case "to_medico_id":
      return Stethoscope;

    case "hospital_id":
      return Building2;

    case "local_id":
      return MapPin;

    case "farmacia_id":
      return Store;

    default:
      return Layers3;
  }
}

function isEntitySelectField(
  key: string
): boolean {
  return [
    "medicamento_id",
    "medico_id",
    "from_medico_id",
    "to_medico_id",
    "hospital_id",
    "local_id",
    "farmacia_id",
  ].includes(key);
}

function isSupportedAttachment(
  file: File
): boolean {
  return (
    file.type.startsWith("image/") ||
    file.type === "application/pdf"
  );
}

function getAttachmentType(
  file: File
): Attachment["type"] {
  return file.type.startsWith("image/")
    ? "image"
    : "pdf";
}

// ============================================================
// PÁGINA
// ============================================================

export default function EditarDetalhePage() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const { user } = useAuth();

  const { trigger } =
    useHapticFeedback();

  const { showToast } =
    useToast();

  const { updateDocument } =
    useSafeDb();

  const id =
    searchParams.get("id") || "";

  const persons =
    usePersons() as Person[];

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const cameraInputRef =
    useRef<HTMLInputElement>(null);

  /*
   * Mantém referência das URLs blob criadas
   * nesta tela para limpeza segura no unmount.
   */
  const objectUrlsRef =
    useRef<Set<string>>(
      new Set()
    );

  // ==========================================================
  // DOCUMENTO
  //
  // undefined = Dexie ainda carregando
  // { document: undefined } = documento realmente não existe
  // ==========================================================

  const documentQuery =
    useLiveQuery(
      async () => {
        if (!id) {
          return {
            document:
              undefined,
          };
        }

        return {
          document:
            await db.documents.get(
              id
            ),
        };
      },
      [id]
    );

  const doc =
    documentQuery?.document;

  const isDocumentLoading =
    documentQuery === undefined;

  // ==========================================================
  // ESTADOS
  // ==========================================================

  const [loading, setLoading] =
    useState(false);

  const [errors, setErrors] =
    useState<
      Record<string, string>
    >({});

  const [
    isTypeModalOpen,
    setIsTypeModalOpen,
  ] = useState(false);

  const [
    activeSelectField,
    setActiveSelectField,
  ] =
    useState<DocumentField | null>(
      null
    );

  const [
    pendingUploads,
    setPendingUploads,
  ] = useState<PendingUpload[]>(
    []
  );

  const [formData, setFormData] =
    useState<FormData>({
      person_id: "",
      category_id: "pessoal",
      type: "rg",
      title: "",
      description: "",
      metadata: {},
      attachments: [],
    });

  // ==========================================================
  // LIMPEZA DAS URLs TEMPORÁRIAS
  // ==========================================================

  useEffect(() => {
    const objectUrls =
      objectUrlsRef.current;

    return () => {
      objectUrls.forEach(
        (url) => {
          URL.revokeObjectURL(
            url
          );
        }
      );

      objectUrls.clear();
    };
  }, []);

  // ==========================================================
  // DADOS RELACIONAIS
  // ==========================================================

  const relationData =
    useLiveQuery(
      async () => {
        const [
          medicos,
          hospitais,
          locais,
          farmacias,
          medicamentos,
        ] = await Promise.all([
          db.medicos.toArray(),
          db.hospitais.toArray(),
          db.locais.toArray(),
          db.farmacias.toArray(),
          db.medicamentos.toArray(),
        ]);

        const personId =
          formData.person_id;

        return {
          medicos: medicos
            .filter((item) =>
              belongsToPerson(
                item.person_id,
                personId
              )
            )
            .sort((a, b) =>
              a.nome.localeCompare(
                b.nome,
                "pt-BR"
              )
            ),

          hospitais: hospitais
            .filter((item) =>
              belongsToPerson(
                item.person_id,
                personId
              )
            )
            .sort((a, b) =>
              a.nome.localeCompare(
                b.nome,
                "pt-BR"
              )
            ),

          locais: locais
            .filter((item) =>
              belongsToPerson(
                item.person_id,
                personId
              )
            )
            .sort((a, b) =>
              a.nome.localeCompare(
                b.nome,
                "pt-BR"
              )
            ),

          farmacias: farmacias
            .filter((item) =>
              belongsToPerson(
                item.person_id,
                personId
              )
            )
            .sort((a, b) =>
              a.nome.localeCompare(
                b.nome,
                "pt-BR"
              )
            ),

          medicamentos:
            medicamentos
              .filter((item) =>
                belongsToPerson(
                  item.person_id,
                  personId
                )
              )
              .sort((a, b) =>
                a.nome.localeCompare(
                  b.nome,
                  "pt-BR"
                )
              ),
        };
      },
      [formData.person_id]
    );

  // ==========================================================
  // POPULA FORMULÁRIO
  // ==========================================================

  useEffect(() => {
    if (!doc) {
      return;
    }

    let metadata =
      migrateLegacyMetadata(
        doc.metadata || {},
        doc.type
      );

    /*
     * Alguns documentos possuem medico_id e
     * hospital_id nas colunas estruturais.
     *
     * Para o formulário enxergar ambos os formatos,
     * trazemos esses IDs para metadata quando o tipo
     * correspondente utiliza a relação.
     */
    if (
      hasDocumentField(
        doc.type,
        "medico_id"
      ) &&
      !getMetadataString(
        metadata,
        "medico_id"
      ) &&
      doc.medico_id
    ) {
      metadata = {
        ...metadata,
        medico_id:
          doc.medico_id,
      };
    }

    if (
      hasDocumentField(
        doc.type,
        "hospital_id"
      ) &&
      !getMetadataString(
        metadata,
        "hospital_id"
      ) &&
      doc.hospital_id
    ) {
      metadata = {
        ...metadata,
        hospital_id:
          doc.hospital_id,
      };
    }

    setFormData({
      person_id:
        doc.person_id || "",
      category_id:
        doc.category_id,
      type: doc.type,
      title: doc.title,
      description:
        doc.description || "",
      metadata,
      attachments:
        doc.attachments || [],
    });

    /*
     * Ao carregar outro documento, qualquer upload
     * local pendente da instância anterior precisa
     * ser descartado.
     */
    setPendingUploads(
      (previous) => {
        previous.forEach(
          (pending) => {
            URL.revokeObjectURL(
              pending.objectUrl
            );

            objectUrlsRef.current.delete(
              pending.objectUrl
            );
          }
        );

        return [];
      }
    );
  }, [doc]);

  // ==========================================================
  // DERIVADOS
  // ==========================================================

  const fields =
    useMemo(
      () =>
        DOCUMENT_FIELDS[
          formData.type
        ],
      [formData.type]
    );

  const allowedDocumentTypes =
    useMemo(() => {
      return (
        Object.keys(
          DOCUMENT_TYPE_LABELS
        ) as DocumentType[]
      )
        .filter((type) =>
          TYPE_CATEGORY_MAP[
            type
          ].includes(
            formData.category_id
          )
        )
        .map((type) => ({
          id: type,
          label:
            DOCUMENT_TYPE_LABELS[
              type
            ],
        }));
    }, [
      formData.category_id,
    ]);

  const selectedTypeLabel =
    DOCUMENT_TYPE_LABELS[
      formData.type
    ];

  const selectedPerson =
    persons.find(
      (person) =>
        person.id ===
        formData.person_id
    );

  const personColor =
    selectedPerson?.color ||
    "#38BDF8";

  // ==========================================================
  // OPTIONS DOS SELECTS
  // ==========================================================

  const selectItems =
    useMemo<SelectItem[]>(
      () => {
        if (
          !activeSelectField
        ) {
          return [];
        }

        if (
          activeSelectField
            .options?.length
        ) {
          return activeSelectField.options.map(
            (option) => ({
              id: option,
              label: option,
            })
          );
        }

        if (!relationData) {
          return [];
        }

        switch (
          activeSelectField.key
        ) {
          case "medicamento_id":
            return relationData.medicamentos
              .filter((item) =>
                Boolean(item.id)
              )
              .map((item) => ({
                id: item.id!,
                label: item.nome,
                description:
                  item.dosagem ||
                  undefined,
              }));

          case "medico_id":
          case "from_medico_id":
          case "to_medico_id":
            return relationData.medicos
              .filter((item) =>
                Boolean(item.id)
              )
              .map((item) => ({
                id: item.id!,
                label: item.nome,
                description:
                  item.especialidade ||
                  item.crm ||
                  undefined,
              }));

          case "hospital_id":
            return relationData.hospitais
              .filter((item) =>
                Boolean(item.id)
              )
              .map((item) => ({
                id: item.id!,
                label: item.nome,
                description:
                  item.tipo ||
                  item.endereco ||
                  undefined,
              }));

          case "local_id":
            return relationData.locais
              .filter((item) =>
                Boolean(item.id)
              )
              .map((item) => ({
                id: item.id!,
                label: item.nome,
                description:
                  item.tipo ||
                  item.endereco ||
                  undefined,
              }));

          case "farmacia_id":
            return relationData.farmacias
              .filter((item) =>
                Boolean(item.id)
              )
              .map((item) => ({
                id: item.id!,
                label: item.nome,
                description:
                  item.endereco ||
                  undefined,
              }));

          default:
            return [];
        }
      },
      [
        activeSelectField,
        relationData,
      ]
    );

  // ==========================================================
  // DISPLAY VALUE DOS SELECTS
  // ==========================================================

  const getSelectValueLabel = (
    field: DocumentField
  ): string => {
    const value =
      getMetadataString(
        formData.metadata,
        field.key
      );

    if (!value) {
      return "Selecionar";
    }

    if (
      field.options?.includes(
        value
      )
    ) {
      return value;
    }

    if (!relationData) {
      return "Carregando...";
    }

    switch (field.key) {
      case "medicamento_id":
        return (
          relationData.medicamentos.find(
            (item) =>
              item.id === value
          )?.nome ||
          "Registro não encontrado"
        );

      case "medico_id":
      case "from_medico_id":
      case "to_medico_id":
        return (
          relationData.medicos.find(
            (item) =>
              item.id === value
          )?.nome ||
          "Registro não encontrado"
        );

      case "hospital_id":
        return (
          relationData.hospitais.find(
            (item) =>
              item.id === value
          )?.nome ||
          "Registro não encontrado"
        );

      case "local_id":
        return (
          relationData.locais.find(
            (item) =>
              item.id === value
          )?.nome ||
          "Registro não encontrado"
        );

      case "farmacia_id":
        return (
          relationData.farmacias.find(
            (item) =>
              item.id === value
          )?.nome ||
          "Registro não encontrado"
        );

      default:
        return value;
    }
  };

  // ==========================================================
  // ALTERAÇÕES DO FORMULÁRIO
  // ==========================================================

  const clearError = (
    key: string
  ) => {
    setErrors((previous) => {
      if (!previous[key]) {
        return previous;
      }

      const next = {
        ...previous,
      };

      delete next[key];

      return next;
    });
  };

  const handlePersonChange = (
    personId: string
  ) => {
    trigger("vibrate");

    setFormData((previous) => ({
      ...previous,
      person_id: personId,
    }));

    clearError("person_id");
  };

  const handleTitleChange = (
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      title: value,
    }));

    clearError("title");
  };

  const handleDescriptionChange = (
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      description: value,
    }));
  };

  const handleMetadataChange = (
    key: string,
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      metadata: {
        ...previous.metadata,
        [key]: value,
      },
    }));

    clearError(key);
  };

  const handleCategoryChange = (
    categoryId: CategoryId
  ) => {
    trigger("vibrate");

    setFormData((previous) => {
      const currentTypeIsAllowed =
        TYPE_CATEGORY_MAP[
          previous.type
        ].includes(categoryId);

      if (
        currentTypeIsAllowed
      ) {
        return {
          ...previous,
          category_id:
            categoryId,
        };
      }

      const nextType = (
        Object.keys(
          DOCUMENT_TYPE_LABELS
        ) as DocumentType[]
      ).find((type) =>
        TYPE_CATEGORY_MAP[
          type
        ].includes(categoryId)
      );

      if (!nextType) {
        return {
          ...previous,
          category_id:
            categoryId,
        };
      }

      return {
        ...previous,
        category_id:
          categoryId,
        type: nextType,
        metadata:
          changeMetadataType(
            previous.metadata,
            previous.type,
            nextType
          ),
      };
    });

    setErrors({});
  };

  const handleTypeChange = (
    nextType: DocumentType
  ) => {
    trigger("vibrate");

    setFormData((previous) => ({
      ...previous,
      type: nextType,
      metadata:
        changeMetadataType(
          previous.metadata,
          previous.type,
          nextType
        ),
    }));

    setErrors({});
    setIsTypeModalOpen(false);
  };

  // ==========================================================
  // ANEXOS
  // ==========================================================

  const addFiles = (
    files: File[],
    source: "file" | "camera"
  ) => {
    const supported =
      files.filter(
        isSupportedAttachment
      );

    if (
      supported.length === 0
    ) {
      trigger("error");

      showToast(
        "Selecione uma imagem ou arquivo PDF.",
        "error"
      );

      return;
    }

    if (
      supported.length !==
      files.length
    ) {
      showToast(
        "Alguns arquivos foram ignorados. O Vault aceita imagens e PDFs.",
        "info"
      );
    }

    const newAttachments:
      Attachment[] = [];

    const newPendingUploads:
      PendingUpload[] = [];

    supported.forEach(
      (file, index) => {
        const attachmentId =
          crypto.randomUUID();

        const objectUrl =
          URL.createObjectURL(
            file
          );

        objectUrlsRef.current.add(
          objectUrl
        );

        const attachmentName =
          source === "camera"
            ? `foto_${Date.now()}_${index + 1}.jpg`
            : file.name;

        newAttachments.push({
          id: attachmentId,
          url: objectUrl,
          name: attachmentName,
          type:
            getAttachmentType(
              file
            ),
          uploaded_at:
            new Date().toISOString(),
        });

        newPendingUploads.push({
          attachmentId,
          file,
          objectUrl,
        });
      }
    );

    setFormData((previous) => ({
      ...previous,
      attachments: [
        ...previous.attachments,
        ...newAttachments,
      ],
    }));

    setPendingUploads(
      (previous) => [
        ...previous,
        ...newPendingUploads,
      ]
    );

    trigger("vibrate");
  };

  const handleFileSelect = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files =
      Array.from(
        event.target.files || []
      );

    if (files.length > 0) {
      addFiles(
        files,
        "file"
      );
    }

    event.target.value = "";
  };

  const handleCameraCapture = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (file) {
      addFiles(
        [file],
        "camera"
      );
    }

    event.target.value = "";
  };

  const removeAttachment = (
    attachmentId: string
  ) => {
    const pending =
      pendingUploads.find(
        (item) =>
          item.attachmentId ===
          attachmentId
      );

    if (pending) {
      URL.revokeObjectURL(
        pending.objectUrl
      );

      objectUrlsRef.current.delete(
        pending.objectUrl
      );

      setPendingUploads(
        (previous) =>
          previous.filter(
            (item) =>
              item.attachmentId !==
              attachmentId
          )
      );
    }

    setFormData((previous) => ({
      ...previous,
      attachments:
        previous.attachments.filter(
          (attachment) =>
            attachment.id !==
            attachmentId
        ),
    }));

    trigger("vibrate");
  };

  // ==========================================================
  // VALIDAÇÃO
  // ==========================================================

  const validate = (): boolean => {
    const newErrors: Record<
      string,
      string
    > = {};

    if (
      !formData.person_id.trim()
    ) {
      newErrors.person_id =
        "Selecione uma pessoa";
    }

    if (!formData.title.trim()) {
      newErrors.title =
        "Título é obrigatório";
    }

    const typeAllowed =
      TYPE_CATEGORY_MAP[
        formData.type
      ].includes(
        formData.category_id
      );

    if (!typeAllowed) {
      newErrors.type =
        "O tipo selecionado não pertence a esta categoria";
    }

    for (const field of fields) {
      if (!field.required) {
        continue;
      }

      const value =
        getMetadataString(
          formData.metadata,
          field.key
        ).trim();

      if (!value) {
        newErrors[field.key] =
          `${field.label} é obrigatório`;
      }
    }

    setErrors(newErrors);

    if (
      Object.keys(newErrors)
        .length > 0
    ) {
      showToast(
        "Revise os campos obrigatórios.",
        "error"
      );

      return false;
    }

    return true;
  };

  // ==========================================================
  // UPLOAD DOS NOVOS ANEXOS
  // ==========================================================

  const uploadPendingAttachments =
    async (): Promise<
      Attachment[]
    > => {
      if (
        pendingUploads.length ===
        0
      ) {
        return [
          ...formData.attachments,
        ];
      }

      if (!user) {
        throw new Error(
          "Usuário não autenticado para upload."
        );
      }

      const finalAttachments = [
        ...formData.attachments,
      ];

      for (
        const pending of
        pendingUploads
      ) {
        /*
         * Se o usuário removeu o anexo antes do save,
         * ele não deve mais existir aqui.
         */
        const attachmentIndex =
          finalAttachments.findIndex(
            (attachment) =>
              attachment.id ===
              pending.attachmentId
          );

        if (
          attachmentIndex === -1
        ) {
          continue;
        }

        const { url } =
          await uploadFile(
            user.id,
            pending.file,
            formData.category_id
          );

        if (!url) {
          throw new Error(
            `Upload sem URL para o anexo ${pending.file.name}.`
          );
        }

        finalAttachments[
          attachmentIndex
        ] = {
          ...finalAttachments[
            attachmentIndex
          ],
          url,
        };
      }

      return finalAttachments;
    };

  const clearUploadedBlobUrls =
    () => {
      pendingUploads.forEach(
        (pending) => {
          URL.revokeObjectURL(
            pending.objectUrl
          );

          objectUrlsRef.current.delete(
            pending.objectUrl
          );
        }
      );

      setPendingUploads([]);
    };

  // ==========================================================
  // SALVAR
  // ==========================================================

  const handleSubmit =
    async () => {
      if (
        !validate() ||
        !doc ||
        !id ||
        loading
      ) {
        trigger("error");
        return;
      }

      setLoading(true);

      try {
        const metadata =
          migrateLegacyMetadata(
            formData.metadata,
            formData.type
          );

        const medicoId =
          hasDocumentField(
            formData.type,
            "medico_id"
          )
            ? getMetadataString(
                metadata,
                "medico_id"
              ) || undefined
            : undefined;

        const hospitalId =
          hasDocumentField(
            formData.type,
            "hospital_id"
          )
            ? getMetadataString(
                metadata,
                "hospital_id"
              ) || undefined
            : undefined;

        /*
         * Os arquivos novos são enviados antes da
         * atualização para impedir que URLs blob:
         * sejam persistidas no documento.
         */
        const finalAttachments =
          await uploadPendingAttachments();

        await updateDocument(id, {
          category_id:
            formData.category_id,

          type:
            formData.type,

          title:
            formData.title.trim(),

          description:
            formData.description.trim() ||
            undefined,

          metadata,

          attachments:
            finalAttachments,

          /*
           * Mantém os índices estruturais do documento
           * alinhados às relações canônicas.
           */
          medico_id:
            medicoId,

          hospital_id:
            hospitalId,
        });

        clearUploadedBlobUrls();

        trigger("success");

        showToast(
          "Documento atualizado",
          "success"
        );

        router.replace(
          `/detalhes?id=${id}`
        );
      } catch (error) {
        console.error(
          "Erro ao atualizar documento:",
          error
        );

        trigger("error");

        showToast(
          "Erro ao atualizar documento",
          "error"
        );
      } finally {
        setLoading(false);
      }
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (isDocumentLoading) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-void">
          <header className="border-b border-surface-border/30 px-5 pb-4 pt-6">
            <div className="mx-auto max-w-3xl">
              <div className="h-11 w-11 animate-pulse rounded-full bg-surface-raised" />
            </div>
          </header>

          <div className="mx-auto max-w-3xl space-y-4 px-5 pt-6">
            <div className="h-32 animate-pulse rounded-[28px] bg-surface" />
            <div className="h-28 animate-pulse rounded-[28px] bg-surface" />
            <div className="h-44 animate-pulse rounded-[28px] bg-surface" />
            <div className="h-72 animate-pulse rounded-[28px] bg-surface" />
            <div className="h-52 animate-pulse rounded-[28px] bg-surface" />
          </div>
        </main>
      </PageTransition>
    );
  }

  // ==========================================================
  // NÃO ENCONTRADO
  // ==========================================================

  if (!doc) {
    return (
      <PageTransition>
        <main className="flex min-h-screen items-center justify-center bg-void px-5">
          <div className="w-full max-w-sm rounded-[28px] border border-surface-border/50 bg-surface px-6 py-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-ink-muted">
              <FileText
                size={22}
              />
            </div>

            <p className="mt-4 text-sm font-medium text-ink-primary">
              Documento não encontrado
            </p>

            <p className="mt-1 text-xs leading-5 text-ink-muted">
              Ele pode ter sido removido ou ainda não estar disponível neste dispositivo.
            </p>

            <Button
              variant="primary"
              onClick={() =>
                router.push("/")
              }
              className="mt-5"
            >
              Voltar
            </Button>
          </div>
        </main>
      </PageTransition>
    );
  }

  // ==========================================================
  // RENDER FIELD
  // ==========================================================

  const renderField = (
    field: DocumentField
  ) => {
    const label =
      field.required
        ? `${field.label} *`
        : field.label;

    if (
      field.type === "select"
    ) {
      const FieldIcon =
        getFieldIcon(
          field.key
        );

      const currentValue =
        getMetadataString(
          formData.metadata,
          field.key
        );

      const valueLabel =
        getSelectValueLabel(
          field
        );

      return (
        <div
          key={field.key}
          className="space-y-2"
        >
          <label className="block text-sm font-medium text-ink-primary">
            {label}
          </label>

          <button
            type="button"
            onClick={() => {
              trigger("vibrate");

              setActiveSelectField(
                field
              );
            }}
            className={`flex w-full items-center justify-between gap-3 rounded-2xl border bg-surface-raised px-4 py-3.5 text-left transition-all active:scale-[0.99] ${
              errors[field.key]
                ? "border-coral/60"
                : currentValue
                  ? "border-surface-border/60 hover:border-ice/30"
                  : "border-surface-border/50 hover:border-ice/30"
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  currentValue
                    ? "bg-ice/10 text-ice"
                    : "bg-surface text-ink-muted"
                }`}
              >
                <FieldIcon
                  size={16}
                />
              </div>

              <div className="min-w-0">
                <p
                  className={`truncate text-sm ${
                    currentValue
                      ? "font-medium text-ink-primary"
                      : "text-ink-muted"
                  }`}
                >
                  {valueLabel}
                </p>

                {isEntitySelectField(
                  field.key
                ) && (
                  <p className="mt-0.5 text-[10px] text-ink-faint">
                    Selecione um cadastro do Vault
                  </p>
                )}
              </div>
            </div>

            <ChevronDown
              size={16}
              className="shrink-0 text-ink-muted"
            />
          </button>

          {errors[field.key] && (
            <p className="px-1 text-xs text-coral">
              {errors[field.key]}
            </p>
          )}
        </div>
      );
    }

    return (
      <Input
        key={field.key}
        label={label}
        type={
          field.type === "date"
            ? "date"
            : "text"
        }
        value={getMetadataString(
          formData.metadata,
          field.key
        )}
        onChange={(event) =>
          handleMetadataChange(
            field.key,
            event.target.value
          )
        }
        error={
          errors[field.key]
        }
      />
    );
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.back();
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={18}
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Vault
              </p>

              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Editar documento
              </h1>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-3xl space-y-4 px-5 pt-6">
          {/* ==================================================
              HERO
              ================================================== */}

          <motion.div
            {...sectionMotion}
            transition={{
              duration: 0.22,
            }}
            className="relative overflow-hidden rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
            style={{
              borderLeft: `4px solid ${personColor}`,
            }}
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-[0.08] blur-3xl"
              style={{
                backgroundColor:
                  personColor,
              }}
            />

            <div className="relative flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised"
                style={{
                  boxShadow: `inset 0 0 0 1px ${personColor}20`,
                }}
              >
                <FileText
                  size={22}
                  className="text-ice"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-surface-border/50 bg-surface-raised px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                    {
                      CATEGORIES[
                        formData.category_id
                      ].name
                    }
                  </span>

                  <span className="rounded-full border border-ice/20 bg-ice/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ice">
                    {
                      selectedTypeLabel
                    }
                  </span>
                </div>

                <h2 className="mt-3 truncate font-display text-lg font-semibold text-ink-primary">
                  {formData.title ||
                    "Sem título"}
                </h2>

                <p className="mt-1 text-xs leading-5 text-ink-faint">
                  Atualize os dados, vínculos e anexos deste documento.
                </p>
              </div>
            </div>
          </motion.div>

          {/* ==================================================
              PESSOA
              ================================================== */}

          <motion.div
            {...sectionMotion}
            transition={{
              duration: 0.22,
              delay: 0.03,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2">
              <UserRound
                size={15}
                className="text-ink-muted"
              />

              <p className="text-sm font-medium text-ink-primary">
                Pessoa *
              </p>
            </div>

            {persons.length ===
            0 ? (
              <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/50 px-4 py-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhuma pessoa cadastrada.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {persons.map(
                  (person) => {
                    const selected =
                      formData.person_id ===
                      person.id;

                    return (
                      <button
                        key={
                          person.id
                        }
                        type="button"
                        onClick={() => {
                          if (
                            person.id
                          ) {
                            handlePersonChange(
                              person.id
                            );
                          }
                        }}
                        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                          selected
                            ? "border-ice bg-ice/12 text-ice"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              person.color,
                          }}
                        />

                        {
                          person.name
                        }

                        {selected && (
                          <Check
                            size={
                              13
                            }
                          />
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            )}

            {errors.person_id && (
              <p className="mt-2 px-1 text-xs text-coral">
                {
                  errors.person_id
                }
              </p>
            )}
          </motion.div>

          {/* ==================================================
              CATEGORIA
              ================================================== */}

          <motion.div
            {...sectionMotion}
            transition={{
              duration: 0.22,
              delay: 0.06,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-ink-primary">
              Categoria
            </p>

            <div className="flex flex-wrap gap-2">
              {Object.values(
                CATEGORIES
              ).map(
                (category) => {
                  const selected =
                    formData.category_id ===
                    category.id;

                  return (
                    <button
                      key={
                        category.id
                      }
                      type="button"
                      onClick={() =>
                        handleCategoryChange(
                          category.id
                        )
                      }
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                        selected
                          ? "border-ice bg-ice/12 text-ice"
                          : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            category.color,
                        }}
                      />

                      {
                        category.name
                      }

                      {selected && (
                        <Check
                          size={
                            13
                          }
                        />
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </motion.div>

          {/* ==================================================
              TIPO
              ================================================== */}

          <motion.div
            {...sectionMotion}
            transition={{
              duration: 0.22,
              delay: 0.09,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm"
          >
            <label className="mb-2 block text-sm font-medium text-ink-primary">
              Tipo
            </label>

            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                setIsTypeModalOpen(
                  true
                );
              }}
              className={`flex w-full items-center justify-between rounded-2xl border bg-surface-raised px-4 py-3.5 text-left text-ink-primary transition-colors ${
                errors.type
                  ? "border-coral/60"
                  : "border-surface-border/50 hover:border-ice/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ice/10 text-ice">
                  <Layers3
                    size={16}
                  />
                </div>

                <div>
                  <span className="block text-sm font-medium">
                    {
                      selectedTypeLabel
                    }
                  </span>

                  <span className="mt-0.5 block text-[10px] text-ink-faint">
                    {
                      allowedDocumentTypes.length
                    }{" "}
                    tipo
                    {allowedDocumentTypes.length !==
                    1
                      ? "s"
                      : ""}{" "}
                    disponível
                    {allowedDocumentTypes.length !==
                    1
                      ? "is"
                      : ""}{" "}
                    nesta categoria
                  </span>
                </div>
              </div>

              <ChevronDown
                size={16}
                className="text-ink-muted"
              />
            </button>

            {errors.type && (
              <p className="mt-2 px-1 text-xs text-coral">
                {errors.type}
              </p>
            )}
          </motion.div>

          {/* ==================================================
              DADOS DO DOCUMENTO
              ================================================== */}

          <motion.div
            {...sectionMotion}
            transition={{
              duration: 0.22,
              delay: 0.12,
            }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm"
          >
            <div className="mb-1">
              <p className="text-sm font-medium text-ink-primary">
                Dados do documento
              </p>

              <p className="mt-1 text-xs leading-5 text-ink-faint">
                Os campos abaixo são definidos automaticamente pelo tipo selecionado.
              </p>
            </div>

            <Input
              label="Título *"
              value={
                formData.title
              }
              onChange={(
                event
              ) =>
                handleTitleChange(
                  event.target.value
                )
              }
              error={
                errors.title
              }
            />

            {fields.map(
              renderField
            )}

            <TextArea
              label="Notas"
              value={
                formData.description
              }
              onChange={(
                event
              ) =>
                handleDescriptionChange(
                  event.target.value
                )
              }
            />
          </motion.div>

          {/* ==================================================
              ANEXOS
              ================================================== */}

          <motion.div
            {...sectionMotion}
            transition={{
              duration: 0.22,
              delay: 0.15,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                <Paperclip
                  size={17}
                />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-primary">
                  Anexos
                </p>

                <p className="mt-0.5 text-xs leading-5 text-ink-faint">
                  Adicione imagens ou PDFs. Novos arquivos serão enviados quando você salvar.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                className="flex items-center justify-center gap-2"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                type="button"
                disabled={
                  loading
                }
              >
                <Upload
                  size={16}
                />
                Arquivo
              </Button>

              <Button
                variant="secondary"
                className="flex items-center justify-center gap-2"
                onClick={() =>
                  cameraInputRef.current?.click()
                }
                type="button"
                disabled={
                  loading
                }
              >
                <Camera
                  size={16}
                />
                Câmera
              </Button>

              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={
                  handleFileSelect
                }
                className="hidden"
              />

              <input
                ref={
                  cameraInputRef
                }
                type="file"
                accept="image/*"
                capture="environment"
                onChange={
                  handleCameraCapture
                }
                className="hidden"
              />
            </div>

            {formData.attachments
              .length === 0 ? (
              <div className="mt-4 rounded-[20px] border border-dashed border-surface-border/50 bg-surface-raised/30 px-4 py-6 text-center">
                <Paperclip
                  size={20}
                  className="mx-auto text-ink-faint"
                />

                <p className="mt-2 text-xs text-ink-muted">
                  Nenhum anexo neste documento.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                <AnimatePresence initial={false}>
                  {formData.attachments.map(
                    (
                      attachment
                    ) => {
                      const isPending =
                        pendingUploads.some(
                          (
                            item
                          ) =>
                            item.attachmentId ===
                            attachment.id
                        );

                      return (
                        <motion.div
                          key={
                            attachment.id
                          }
                          initial={{
                            opacity: 0,
                            y: 8,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          exit={{
                            opacity: 0,
                            y: 8,
                          }}
                          className="flex items-center gap-3 rounded-[20px] border border-surface-border/50 bg-surface-raised px-3.5 py-3"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-surface-border/40 bg-surface">
                            {attachment.type ===
                            "image" ? (
                              <img
                                src={
                                  attachment.thumbnail_url ||
                                  attachment.url
                                }
                                alt={
                                  attachment.name
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <FileText
                                size={
                                  17
                                }
                                className="text-ice"
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink-primary">
                              {
                                attachment.name
                              }
                            </p>

                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-[10px] uppercase tracking-wider text-ink-faint">
                                {attachment.type ===
                                "image"
                                  ? "Imagem"
                                  : "PDF"}
                              </span>

                              {isPending && (
                                <span className="rounded-full bg-ice/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ice">
                                  Novo
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeAttachment(
                                attachment.id
                              )
                            }
                            disabled={
                              loading
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-coral/10 hover:text-coral disabled:opacity-40"
                            aria-label={`Remover anexo ${attachment.name}`}
                          >
                            <X
                              size={
                                15
                              }
                            />
                          </button>
                        </motion.div>
                      );
                    }
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* ==================================================
              SALVAR
              ================================================== */}

          <motion.div
            {...sectionMotion}
            transition={{
              duration: 0.22,
              delay: 0.18,
            }}
          >
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={
                handleSubmit
              }
              disabled={
                loading
              }
              className="flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />

                  Salvando...
                </>
              ) : (
                <>
                  <Save
                    size={16}
                  />

                  Salvar alterações
                </>
              )}
            </Button>
          </motion.div>
        </section>

        {/* ====================================================
            MODAL — TIPO
            ==================================================== */}

        <SelectionModal
          isOpen={
            isTypeModalOpen
          }
          onClose={() =>
            setIsTypeModalOpen(
              false
            )
          }
          onSelect={(
            item
          ) =>
            handleTypeChange(
              item.id as DocumentType
            )
          }
          items={
            allowedDocumentTypes
          }
          title="Tipo de Documento"
          placeholder="Buscar tipo..."
          renderItem={(
            item
          ) => (
            <div>
              <p className="font-medium text-ink-primary">
                {
                  item.label
                }
              </p>
            </div>
          )}
          getItemId={(
            item
          ) => item.id}
          getItemLabel={(
            item
          ) => item.label}
        />

        {/* ====================================================
            MODAL — CAMPOS SELECT
            ==================================================== */}

        <SelectionModal
          isOpen={Boolean(
            activeSelectField
          )}
          onClose={() =>
            setActiveSelectField(
              null
            )
          }
          onSelect={(
            item
          ) => {
            if (
              !activeSelectField
            ) {
              return;
            }

            trigger(
              "vibrate"
            );

            handleMetadataChange(
              activeSelectField.key,
              item.id
            );

            setActiveSelectField(
              null
            );
          }}
          items={
            selectItems
          }
          title={
            activeSelectField?.label ||
            "Selecionar"
          }
          placeholder="Buscar..."
          renderItem={(
            item
          ) => (
            <div className="min-w-0">
              <p className="truncate font-medium text-ink-primary">
                {
                  item.label
                }
              </p>

              {item.description && (
                <p className="mt-0.5 truncate text-xs text-ink-muted">
                  {
                    item.description
                  }
                </p>
              )}
            </div>
          )}
          getItemId={(
            item
          ) => item.id}
          getItemLabel={(
            item
          ) => item.label}
        />
      </main>
    </PageTransition>
  );
}