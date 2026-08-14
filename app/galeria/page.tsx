"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Images, HeartPulse, Shield, User, Plus, 
  X, Share2, FileText, Download, AlertCircle 
} from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useGaleria, type GalleryItem } from "@/hooks/useGaleria";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { UploadGaleriaModal } from "@/components/UploadGaleriaModal";

export default function GaleriaPage() {
  const { trigger } = useHapticFeedback();
  const persons = usePersons();
  
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"saude" | "pessoal">("saude");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);

  // Motor da Galeria que criamos (traz tudo unificado)
  const { items, isLoading } = useGaleria(selectedPerson || undefined);

  // Filtra as abas e agrupa por mês/ano dinamicamente
  const groupedFilteredItems = useMemo(() => {
    const filtered = items.filter((item) => item.category === activeTab);
    const groups: Record<string, GalleryItem[]> = {};

    filtered.forEach((item) => {
      const d = new Date(item.date);
      if (isNaN(d.getTime())) return;
      const mesAno = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      const label = mesAno.charAt(0).toUpperCase() + mesAno.slice(1);

      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });

    return groups;
  }, [items, activeTab]);

  const handleShare = async (item: GalleryItem) => {
    trigger("vibrate");
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: `Confira este documento: ${item.title}`,
          url: item.url,
        });
      } else {
        // Fallback: abre em nova aba se não tiver Web Share API (ex: PC antigo)
        window.open(item.url, "_blank");
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
    }
  };

  const openLightbox = (item: GalleryItem) => {
    trigger("vibrate");
    if (item.file_type === "pdf") {
      window.open(item.url, "_blank"); // PDFs abrem direto no visualizador do celular
    } else {
      setLightboxItem(item);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(6rem+env(safe-area-inset-bottom))]">
        
        {/* HEADER & FILTROS */}
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/85 pt-safe backdrop-blur-xl">
          <div className="px-5 pt-4 pb-2">
            <h1 className="font-display text-2xl font-bold text-ink-primary">Galeria</h1>
            
            {/* Filtro de Pessoas (Bolinhas) */}
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
              <button
                onClick={() => { trigger("vibrate"); setSelectedPerson(null); }}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 transition-all ${
                  selectedPerson === null ? "border-ice bg-ice/15 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }`}
              >
                <Images size={14} />
                <span className="text-sm font-medium">Todos</span>
              </button>
              
              {persons.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => { trigger("vibrate"); setSelectedPerson(p.id); }}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 transition-all ${
                    selectedPerson === p.id ? "border-ice bg-ice/15 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"
                  }`}
                >
                  <User size={14} />
                  <span className="text-sm font-medium">{p.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Abas Deslizantes */}
          <div className="flex border-t border-surface-border/30">
            <button
              onClick={() => { trigger("vibrate"); setActiveTab("saude"); }}
              className={`relative flex-1 py-4 text-sm font-semibold transition-colors ${
                activeTab === "saude" ? "text-emerald-400" : "text-ink-muted"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <HeartPulse size={16} /> Saúde
              </div>
              {activeTab === "saude" && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
              )}
            </button>
            <button
              onClick={() => { trigger("vibrate"); setActiveTab("pessoal"); }}
              className={`relative flex-1 py-4 text-sm font-semibold transition-colors ${
                activeTab === "pessoal" ? "text-ice" : "text-ink-muted"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Shield size={16} /> Pessoal
              </div>
              {activeTab === "pessoal" && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-ice" />
              )}
            </button>
          </div>
        </header>

        {/* GRID DA GALERIA */}
        <section className="px-4 pt-4">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-ice border-t-transparent" />
            </div>
          ) : Object.keys(groupedFilteredItems).length === 0 ? (
            <div className="mt-10 flex flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-raised">
                <Images size={28} className="text-ink-faint" />
              </div>
              <p className="mt-4 font-display text-lg font-medium text-ink-primary">Nenhum arquivo encontrado</p>
              <p className="mt-1 max-w-[250px] text-sm text-ink-muted">Clique no botão abaixo para digitalizar seus primeiros comprovantes.</p>
            </div>
          ) : (
            Object.entries(groupedFilteredItems).map(([mesAno, groupItems]) => (
              <div key={mesAno} className="mb-8">
                <h2 className="mb-3 pl-1 text-sm font-bold text-ink-primary">{mesAno}</h2>
                <div className="grid grid-cols-3 gap-2">
                  {groupItems.map((item) => (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      key={item.id}
                      onClick={() => openLightbox(item)}
                      className="group relative aspect-square overflow-hidden rounded-[18px] border border-surface-border/40 bg-surface-raised"
                    >
                      {item.file_type === "image" ? (
                        <img 
                          src={item.thumbnail_url || item.url} 
                          alt={item.title} 
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-void/40 p-2">
                          <FileText size={24} className="mb-1 text-coral/80" />
                          <span className="line-clamp-2 text-center text-[10px] font-medium text-ink-muted">{item.title}</span>
                        </div>
                      )}
                      
                      {/* Degradê e Título (Aparece no fundo do quadrado) */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-void/90 via-void/40 to-transparent p-2 pt-6">
                        <p className="truncate text-[10px] font-medium text-white/90">{item.title}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

        {/* FAB (Botão Flutuante de Upload) */}
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-5 z-30">
          <button
            onClick={() => { trigger("vibrate"); setIsUploadOpen(true); }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-ice text-void shadow-[0_8px_30px_rgb(125,211,252,0.3)] transition-transform active:scale-90"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* MODAL DE UPLOAD INTELIGENTE */}
        <UploadGaleriaModal 
          isOpen={isUploadOpen} 
          onClose={() => setIsUploadOpen(false)} 
        />

        {/* LIGHTBOX (Visualizador Tela Cheia) */}
        <AnimatePresence>
          {lightboxItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl"
            >
              {/* Topbar do Lightbox */}
              <div className="flex items-center justify-between p-4 pt-safe">
                <button onClick={() => setLightboxItem(null)} className="rounded-full bg-white/10 p-2 text-white backdrop-blur-md active:scale-95">
                  <X size={20} />
                </button>
                <button onClick={() => handleShare(lightboxItem)} className="flex items-center gap-2 rounded-full bg-ice px-4 py-2 text-sm font-bold text-void active:scale-95">
                  <Share2 size={16} /> Compartilhar
                </button>
              </div>

              {/* Imagem (Permite zoom pelo celular nativamente) */}
              <div className="flex-1 overflow-auto p-4">
                <img 
                  src={lightboxItem.url} 
                  alt={lightboxItem.title} 
                  className="h-full w-full object-contain"
                />
              </div>

              {/* Rodapé do Lightbox */}
              <div className="bg-gradient-to-t from-black to-transparent p-6 pb-safe">
                <h2 className="text-xl font-bold text-white">{lightboxItem.title}</h2>
                <p className="text-sm text-white/60">{lightboxItem.subtitle} • {new Date(lightboxItem.date).toLocaleDateString("pt-BR")}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </PageTransition>
  );
}
