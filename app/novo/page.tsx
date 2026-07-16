"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Camera } from "lucide-react";
import { useProfiles } from "@/hooks/useLocalData";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { AREAS, CATEGORY_META, type DocumentCategory } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";

type FormData = {
  profileId: number;
  areaId: string;
  category: DocumentCategory;
  title: string;
  notes: string;
  documentDate: string;
  expiryDate: string;
  fileLocalUri?: string;
};

export default function NewDocumentPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { add } = useSafeDb();
  const profiles = useProfiles();

  const [formData, setFormData] = useState<FormData>({
    profileId: profiles[0]?.id || 1,
    areaId: "saude",
    category: "prontuario",
    title: "",
    notes: "",
    documentDate: "",
    expiryDate: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const handleChange = (
    field: keyof FormData,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Título é obrigatório";
    }

    if (!formData.profileId) {
      newErrors.profileId = "Selecione um perfil";
    }

    if (!formData.areaId) {
      newErrors.areaId = "Selecione uma área";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      trigger("error");
      return;
    }

    setIsLoading(true);
    try {
      const docData = {
        profileId: formData.profileId,
        areaId: formData.areaId,
        category: formData.category,
        title: formData.title.trim(),
        notes: formData.notes.trim() || undefined,
        documentDate: formData.documentDate || undefined,
        expiryDate: formData.expiryDate || undefined,
        fileLocalUri: formData.fileLocalUri,
        isFavorite: false,
      };

      await add(docData);
      trigger("success");
      router.push("/");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      trigger("error");
    } finally {
      setIsLoading(false);
    }
  };

  const availableCategories = AREAS.find(a => a.id === formData.areaId)
    ? Object.entries(CATEGORY_META).map(([key, meta]) => ({
        id: key as DocumentCategory,
        label: meta.label,
      }))
    : [];

  return (
    <main className="min-h-screen bg-void pb-28">
      {/* Header */}
      <header className="glass-header sticky top-0 z-10 px-5 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              trigger("vibrate");
              router.back();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98] transition-all"
          >
            <ArrowLeft size={18} className="text-ink-primary" />
          </button>
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
            <h1 className="font-display text-xl font-semibold text-ink-primary">
              Novo documento
            </h1>
          </div>
        </div>
      </header>

      {/* Formulário */}
      <section className="px-5 pt-6 space-y-4">
        {/* Perfil */}
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">
            Perfil
          </label>
          <div className="flex gap-2 flex-wrap">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => handleChange("profileId", profile.id!)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all active:scale-[0.98] ${
                  formData.profileId === profile.id
                    ? "border-ice bg-ice/10 text-ice"
                    : "border-surface-border bg-surface-raised text-ink-muted hover:text-ink-primary"
                }`}
              >
                <span>{profile.icon}</span>
                <span className="text-sm font-medium">{profile.name}</span>
              </button>
            ))}
          </div>
          {errors.profileId && (
            <p className="text-xs text-coral mt-1">{errors.profileId}</p>
          )}
        </div>

        {/* Área */}
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">
            Área
          </label>
          <div className="flex gap-2 flex-wrap">
            {AREAS.map((area) => (
              <button
                key={area.id}
                onClick={() => {
                  handleChange("areaId", area.id);
                  // Reset category quando mudar área
                  const firstCategory = Object.keys(CATEGORY_META)[0] as DocumentCategory;
                  handleChange("category", firstCategory);
                }}
                className={`px-4 py-2 rounded-full border transition-all active:scale-[0.98] ${
                  formData.areaId === area.id
                    ? "border-ice bg-ice/10 text-ice"
                    : "border-surface-border bg-surface-raised text-ink-muted hover:text-ink-primary"
                }`}
              >
                <span className="text-sm font-medium">{area.name}</span>
              </button>
            ))}
          </div>
          {errors.areaId && (
            <p className="text-xs text-coral mt-1">{errors.areaId}</p>
          )}
        </div>

        {/* Categoria */}
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1.5">
            Categoria
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleChange("category", e.target.value as DocumentCategory)}
            className="w-full rounded-xl bg-surface-raised border border-surface-border px-4 py-3 text-ink-primary focus:outline-none focus:border-steel-light transition-colors"
          >
            {availableCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Título */}
        <Input
          label="Título do documento"
          placeholder="Ex: CNH, Receita médica, etc."
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          error={errors.title}
        />

        {/* Datas */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data do documento"
            type="date"
            value={formData.documentDate}
            onChange={(e) => handleChange("documentDate", e.target.value)}
          />
          <Input
            label="Data de validade"
            type="date"
            value={formData.expiryDate}
            onChange={(e) => handleChange("expiryDate", e.target.value)}
          />
        </div>

        {/* Notas */}
        <TextArea
          label="Notas (opcional)"
          placeholder="Informações adicionais..."
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
        />

        {/* Upload de arquivo */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            className="flex items-center justify-center gap-2"
            onClick={() => trigger("vibrate")}
          >
            <Upload size={16} />
            Upload
          </Button>
          <Button
            variant="secondary"
            className="flex items-center justify-center gap-2"
            onClick={() => trigger("vibrate")}
          >
            <Camera size={16} />
            Câmera
          </Button>
        </div>

        {/* Botão salvar */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleSubmit}
          disabled={isLoading}
          className="mt-4"
        >
          {isLoading ? "Salvando..." : "Salvar documento"}
        </Button>
      </section>
    </main>
  );
}