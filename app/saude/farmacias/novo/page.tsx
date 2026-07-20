"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";

export default function NovaFarmaciaPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const { addFarmacia } = useFarmacias();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    endereco: "",
    telefone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nome.trim()) {
      newErrors.nome = "Nome é obrigatório";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      trigger("error");
      return;
    }

    setLoading(true);
    try {
      await addFarmacia({
        user_id: user?.id || "",
        nome: formData.nome.trim(),
        endereco: formData.endereco.trim() || undefined,
        telefone: formData