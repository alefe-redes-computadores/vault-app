"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Images, HeartPulse, Shield, Search 
} from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useGaleria, type GalleryItem } from "@/hooks/useGaleria";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { UploadGaleriaModal } from "@/components/UploadGaleriaModal";
import { DocumentPreview } from "@/components/galeria/DocumentPreview";
import { DocumentViewer } from "@/components/galeria/DocumentViewer";

// ============================================================================
// COMPONENTES DE CONTEÚDO (GalleryContent)
// ============================================================================

function GallerySkeleton() {
  return (
    <div className="animate-pulse space-y-8 px-5 pt-8">
      <div>
        <div className="mb-4 h-4 w-28 rounded-md bg-surface-border/40"></div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square rounded-[20px] bg-surface-border/20"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GalleryEmptyState({ activeTab, personName }: { activeTab: "saude" | "pessoal", personName?: string }) {
  let title = "Sua galeria está vazia";
  let subtitle = "Adicione documentos, exames e receitas para mantê-los seguros.";

  if (personName) {
    title = `Nenhum documento encontrado para ${personName.split(' ')[0]}`;
    subtitle = `Não há registros de ${activeTab === "saude" ? "saúde" : "uso pessoal"} para esta pessoa.`;
  } else if (activeTab === "saude") {
    title = "Nenhum documento de saúde";
    subtitle = "Receitas, exames e laudos médicos aparecerão aqui.";
  } else if (activeTab === "pessoal") {
    title = "Nenhum documento pessoal";
    subtitle = "RG, CNH, passaporte e certificados podem ser armazenados aqui.";
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-16 flex flex-col items-center justify-center text-center px-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-surface-raised border border-surface-border/50 shadow-sm mb-5">
        <Images size={32} className="text-ink-muted/50" />
      </div>
      <p className="font-display text-[19px] font-bold text-ink-primary leading-tight">{title}</p>
      <p className="mt-2 text-sm text-ink-muted leading-relaxed max-w-[260px]">{subtitle}</p>
    </motion.div>
  );
}

// ============================================================================
// ORQUESTRADOR PRINCIPAL (GaleriaPage)
// ============================================================================

export default function GaleriaPage() {
  const { trigger } = useHapticFeedback();
  const persons = usePersons();
  const searchParams = useSearchParams();
  
  // ESTADO VISUAL
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"saude" | "pessoal">("saude");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<GalleryItem | null>(null);

  useEffect(() => {
    if (searchParams.get("upload") === "true") setIsUploadOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (viewingItem || isUploadOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [viewingItem, isUploadOpen]);

  // CAMADA DE DADOS (Dexie Orchestrator)
  const { items, isLoading } = useGaleria(selectedPerson || undefined);

  // ACCENT LAYER (A cor da pessoa atua como highlight sutil)
  const activePersonObj = useMemo(() => persons.find((p: any) => p.id === selectedPerson), [persons, selectedPerson]);
  const themeColors = { saude: "#34D399", pessoal: "#38BDF8" }; 
  const accentColor = activePersonObj?.color || themeColors[activeTab];

  // AGRUPAMENTO SEMÂNTICO (Hoje, Ontem, 7 Dias, Meses)
  const groupedFilteredItems = useMemo(() => {
    const filtered = items.filter((item) => item.category === activeTab);
    const groups: Record<string, GalleryItem[]> = {};
    
    const hojeBase = new Date();
    hojeBase.setHours(0, 0, 0, 0);

    filtered.forEach((item) => {
      const d = new Date(item.date);
      if (isNaN(d.getTime())) return;
      
      const docDate = new Date(d);
      docDate.setHours(0, 0, 0, 0);

      const diffTime = hojeBase.getTime() - docDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let label = "";
      if (diffDays === 0) label = "Hoje";
      else if (diffDays === 1) label = "Ontem";
      else if (diffDays > 1 && diffDays <= 7) label = "Últimos 7 dias";
      else {
        const mesAno = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        label = mesAno.charAt(0).toUpperCase() + mesAno.slice(1);
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });

    // Força a ordem semântica das chaves
    const orderedGroups: Record<string, GalleryItem[]> = {};
    const prioKeys = ["Hoje", "Ontem", "Últimos 7 dias"];
    
    prioKeys.forEach(key => {
      if (groups[key]) orderedGroups[key] = groups[key];
    });
    
    Object.keys(groups).forEach(key => {
      if (!prioKeys.includes(key)) orderedGroups[key] = groups[key];
    });

    return orderedGroups;
  }, [items, activeTab]);

  // APENAS AÇÕES DIRETAS POSSUEM HAPTICS
  const handleShare = async (item: GalleryItem) => {
    trigger("vibrate"); // Haptic aprovado para ação de saída
    try {
      if (navigator.share) await navigator.share({ title: item.title, url: item.url });
    } catch (error) {}
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(6rem+env(safe-area-inset-bottom))]">
        
        {/* GALLERY HEADER */}
        <header className="sticky top-0 z-20 bg-void/85 pt-safe backdrop-blur-xl transition-colors duration-300 border-b border-surface-border/30">
          <div className="px-5 pt-6 pb-4 flex items-center justify-between">
            <h1 className="font-display text-[28px] font-bold text-ink-primary tracking-tight">Galeria</h1>
            <button className="h-11 w-11 flex items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 text-ink-primary transition-transform active:scale-95">
              <Search size={18} />
            </button>
          </div>
            
          {/* PERSON SELECTOR (Accent Layer Suave) */}
          <div className="flex gap-3 overflow-x-auto px-5 pb-5 custom-scrollbar">
            <button
              onClick={() => setSelectedPerson(null)} // Sem Haptic
              className={`flex shrink-0 items-center gap-2 rounded-full border px-5 py-2.5 transition-all duration-300 ${
                selectedPerson === null ? "font-bold" : "border-surface-border/50 bg-surface-raised text-ink-muted"
              }`}
              style={selectedPerson === null ? { borderColor: accentColor, backgroundColor: `${accentColor}1A`, color: accentColor } : {}}
            >
              <Images size={15} />
              <span className="text-sm">Todos</span>
            </button>
            
            {persons.map((p: any) => (
              <button
                key={p.id}
                onClick={() => setSelectedPerson(p.id)} // Sem Haptic
                className={`flex shrink-0 items-center gap-2 rounded-full border pr-5 pl-2 py-1.5 transition-all duration-300 ${
                  selectedPerson === p.id ? "font-bold" : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }`}
                style={selectedPerson === p.id ? { borderColor: accentColor, backgroundColor: `${accentColor}1A`, color: accentColor } : {}}
              >
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.name} className="h-7 w-7 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold shadow-sm" style={{ backgroundColor: p.color || "#4B5563", color: "#FFF" }}>
                    {p.name.charAt(0)}
                  </div>
                )}
                <span className="text-sm">{p.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* CATEGORY TABS */}
          <div className="flex">
            <button
              onClick={() => setActiveTab("saude")} // Sem Haptic
              className={`relative flex-1 py-4 text-[13px] uppercase tracking-widest font-bold transition-colors duration-300 ${
                activeTab === "saude" ? "text-ink-primary" : "text-ink-muted"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <HeartPulse size={16} className={activeTab === "saude" ? "" : "opacity-60"} style={activeTab === "saude" ? { color: accentColor } : {}} /> Saúde
              </div>
              {activeTab === "saude" && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-md" style={{ backgroundColor: accentColor }} />
              )}
            </button>
            <button
              onClick={() => setActiveTab("pessoal")} // Sem Haptic
              className={`relative flex-1 py-4 text-[13px] uppercase tracking-widest font-bold transition-colors duration-300 ${
                activeTab === "pessoal" ? "text-ink-primary" : "text-ink-muted"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Shield size={16} className={activeTab === "pessoal" ? "" : "opacity-60"} style={activeTab === "pessoal" ? { color: accentColor } : {}} /> Pessoal
              </div>
              {activeTab === "pessoal" && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-md" style={{ backgroundColor: accentColor }} />
              )}
            </button>
          </div>
        </header>

        {/* GALLERY CONTENT */}
        {isLoading ? (
          <GallerySkeleton />
        ) : Object.keys(groupedFilteredItems).length === 0 ? (
          <GalleryEmptyState activeTab={activeTab} personName={activePersonObj?.name} />
        ) : (
          <section className="px-5 pt-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {Object.entries(groupedFilteredItems).map(([mesAno, groupItems]) => (
                <div key={mesAno} className="mb-10">
                  <h2 className="mb-4 pl-1 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-muted">{mesAno}</h2>
                  {/* Grid de 2 Colunas (Premium) */}
                  <div className="grid grid-cols-2 gap-4">
                    {groupItems.map((item) => (
                      <DocumentPreview 
                        key={item.id} 
                        item={item} 
                        accentColor={accentColor} 
                        onClick={(i) => setViewingItem(i)} // Sem Haptic de abertura
                      />
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </section>
        )}

        <UploadGaleriaModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />

        <AnimatePresence>
          {viewingItem && (
            <DocumentViewer 
              item={viewingItem} 
              onClose={() => setViewingItem(null)} // Sem Haptic de fechamento
              onShare={handleShare} 
            />
          )}
        </AnimatePresence>

      </main>
    </PageTransition>
  );
}
