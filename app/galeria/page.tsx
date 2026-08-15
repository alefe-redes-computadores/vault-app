"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Images, HeartPulse, Shield, User, Search 
} from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useGaleria, type GalleryItem } from "@/hooks/useGaleria";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { UploadGaleriaModal } from "@/components/UploadGaleriaModal";
import { DocumentPreview } from "@/components/galeria/DocumentPreview";
import { DocumentViewer } from "@/components/galeria/DocumentViewer";

// ============================================================================
// COMPONENTES DE ESTADO INTERNO (Empty & Skeleton)
// ============================================================================

function GallerySkeleton() {
  return (
    <div className="animate-pulse space-y-8">
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
  let title = "Nenhum arquivo encontrado";
  let subtitle = "Adicione documentos para mantê-los seguros.";

  if (personName) {
    title = `Sem documentos de ${personName.split(' ')[0]}`;
    subtitle = `Não há registros de ${activeTab === "saude" ? "saúde" : "uso pessoal"} para esta pessoa.`;
  } else if (activeTab === "saude") {
    title = "Nenhum documento de saúde";
    subtitle = "Receitas, exames e laudos médicos aparecerão aqui.";
  } else {
    title = "Nenhum documento pessoal";
    subtitle = "RG, CNH e certificados podem ser armazenados aqui.";
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
  
  // Estado Visual
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"saude" | "pessoal">("saude");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<GalleryItem | null>(null);

  // Auto-abre modal de upload
  useEffect(() => {
    if (searchParams.get("upload") === "true") setIsUploadOpen(true);
  }, [searchParams]);

  // Trava scroll do body
  useEffect(() => {
    if (viewingItem || isUploadOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [viewingItem, isUploadOpen]);

  // DADOS (O Dexie comanda aqui, isLoading só é true no primeiro respiro do banco)
  const { items, isLoading } = useGaleria(selectedPerson || undefined);

  // ACCENT LAYER (Identidade Dinâmica)
  const activePersonObj = useMemo(() => persons.find((p: any) => p.id === selectedPerson), [persons, selectedPerson]);
  const themeColors = { saude: "#34D399", pessoal: "#38BDF8" }; 
  const accentColor = activePersonObj?.color || themeColors[activeTab];

  // AGRUPAMENTO INTELIGENTE (Recentes vs Datas Antigas)
  const groupedFilteredItems = useMemo(() => {
    const filtered = items.filter((item) => item.category === activeTab);
    const groups: Record<string, GalleryItem[]> = {};
    const hoje = new Date();
    
    // Zera horas para comparação justa
    hoje.setHours(0, 0, 0, 0);

    filtered.forEach((item) => {
      const d = new Date(item.date);
      if (isNaN(d.getTime())) return;
      d.setHours(0, 0, 0, 0);

      const diffTime = Math.abs(hoje.getTime() - d.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let label = "";
      if (diffDays <= 7) {
        label = "Recentes";
      } else {
        const mesAno = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        label = mesAno.charAt(0).toUpperCase() + mesAno.slice(1);
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });

    // Ordenação para "Recentes" aparecer primeiro
    const orderedGroups: Record<string, GalleryItem[]> = {};
    if (groups["Recentes"]) orderedGroups["Recentes"] = groups["Recentes"];
    Object.keys(groups).forEach(key => {
      if (key !== "Recentes") orderedGroups[key] = groups[key];
    });

    return orderedGroups;
  }, [items, activeTab]);

  const handleShare = async (item: GalleryItem) => {
    trigger("vibrate");
    try {
      if (navigator.share) await navigator.share({ title: item.title, url: item.url });
    } catch (error) {}
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(6rem+env(safe-area-inset-bottom))]">
        
        {/* GALLERY HEADER */}
        <header className="sticky top-0 z-20 bg-void/85 pt-safe backdrop-blur-xl transition-colors duration-300">
          <div className="px-5 pt-6 pb-4 flex items-center justify-between">
            <h1 className="font-display text-[28px] font-bold text-ink-primary tracking-tight">Galeria</h1>
            <button className="h-11 w-11 flex items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 text-ink-primary transition-transform active:scale-95">
              <Search size={18} />
            </button>
          </div>
            
          {/* PERSON SELECTOR (Accent Layer) */}
          <div className="flex gap-3 overflow-x-auto px-5 pb-5 custom-scrollbar">
            <button
              onClick={() => setSelectedPerson(null)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-5 py-2.5 transition-all duration-300 ${
                selectedPerson === null ? "bg-opacity-15 font-bold" : "border-surface-border/50 bg-surface-raised text-ink-muted"
              }`}
              style={selectedPerson === null ? { borderColor: accentColor, backgroundColor: `${accentColor}15`, color: accentColor } : {}}
            >
              <Images size={15} />
              <span className="text-sm">Todos</span>
            </button>
            
            {persons.map((p: any) => (
              <button
                key={p.id}
                onClick={() => setSelectedPerson(p.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full border pr-5 pl-2 py-1.5 transition-all duration-300 ${
                  selectedPerson === p.id ? "bg-opacity-15 font-bold" : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }`}
                style={selectedPerson === p.id ? { borderColor: accentColor, backgroundColor: `${accentColor}15`, color: accentColor } : {}}
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

          {/* CATEGORY TABS (Accent Layer) */}
          <div className="flex border-b border-surface-border/30">
            <button
              onClick={() => setActiveTab("saude")}
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
              onClick={() => setActiveTab("pessoal")}
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
        <section className="px-5 pt-8">
          {isLoading && items.length === 0 ? (
            <GallerySkeleton />
          ) : Object.keys(groupedFilteredItems).length === 0 ? (
            <GalleryEmptyState activeTab={activeTab} personName={activePersonObj?.name} />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {Object.entries(groupedFilteredItems).map(([mesAno, groupItems]) => (
                <div key={mesAno} className="mb-10">
                  <h2 className="mb-4 pl-1 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-muted">{mesAno}</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {groupItems.map((item) => (
                      <DocumentPreview 
                        key={item.id} 
                        item={item} 
                        accentColor={accentColor} 
                        onClick={(i) => { trigger("vibrate"); setViewingItem(i); }} 
                      />
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </section>

        <UploadGaleriaModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />

        <AnimatePresence>
          {viewingItem && (
            <DocumentViewer 
              item={viewingItem} 
              onClose={() => setViewingItem(null)} 
              onShare={handleShare} 
            />
          )}
        </AnimatePresence>

      </main>
    </PageTransition>
  );
}
