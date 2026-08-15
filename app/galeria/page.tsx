"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Images, HeartPulse, Shield, User, 
  X, Share2, FileText, FileWarning, Search, Image as ImageIcon
} from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useGaleria, type GalleryItem } from "@/hooks/useGaleria";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { UploadGaleriaModal } from "@/components/UploadGaleriaModal";

// ============================================================================
// COMPONENTES DE APRESENTAÇÃO (UI Pura)
// ============================================================================

/**
 * SKELETON: Imita a geometria real do grid de 2 colunas para evitar Layout Shift
 */
function GallerySkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div>
        <div className="mb-3 h-4 w-24 rounded-md bg-surface-border/50"></div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square rounded-[20px] bg-surface-border/30"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * EMPTY STATE CONTEXTUAL: Mensagens diferentes dependendo do filtro atual
 */
function GalleryEmptyState({ 
  activeTab, 
  personName 
}: { 
  activeTab: "saude" | "pessoal", 
  personName?: string 
}) {
  let title = "Nenhum arquivo encontrado";
  let subtitle = "Toque no botão central (+) no menu inferior para adicionar novos arquivos.";

  if (personName) {
    title = `Sem documentos para ${personName.split(' ')[0]}`;
    subtitle = `Não encontramos arquivos de ${activeTab === "saude" ? "saúde" : "uso pessoal"} vinculados a esta pessoa.`;
  } else if (activeTab === "saude") {
    title = "Nenhum documento de saúde";
    subtitle = "Receitas, exames e laudos médicos aparecerão aqui.";
  } else {
    title = "Nenhum documento pessoal";
    subtitle = "RG, CNH, passaportes e certificados podem ser armazenados aqui.";
  }

  return (
    <div className="mt-12 flex flex-col items-center justify-center text-center px-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-surface-raised border border-surface-border/50 shadow-sm">
        <Images size={32} className="text-ink-muted/50" />
      </div>
      <p className="mt-5 font-display text-[17px] font-semibold text-ink-primary">{title}</p>
      <p className="mt-2 text-sm text-ink-muted leading-relaxed">{subtitle}</p>
    </div>
  );
}

/**
 * DOCUMENT PREVIEW: Máquina de estados para Imagens e PDFs (Loading -> Success/Error)
 */
function DocumentPreviewCard({ 
  item, 
  accentColor, 
  onClick 
}: { 
  item: GalleryItem; 
  accentColor: string;
  onClick: (item: GalleryItem) => void;
}) {
  const [imgStatus, setImgStatus] = useState<"loading" | "success" | "error">("loading");

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick(item)}
      className="group relative aspect-square overflow-hidden rounded-[24px] border bg-surface transition-all"
      style={{ borderColor: `${accentColor}30` }} // Accent color suave na borda
    >
      {item.file_type === "pdf" ? (
        // PREVIEW DE PDF
        <div className="flex h-full w-full flex-col items-center justify-center bg-void/50 p-3">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-coral/10 text-coral">
            <FileText size={24} />
          </div>
          <span className="rounded bg-surface-border/50 px-2 py-0.5 text-[10px] font-bold text-ink-primary uppercase tracking-wider">PDF</span>
        </div>
      ) : (
        // PREVIEW DE IMAGEM COM ESTADOS
        <>
          {imgStatus === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-raised">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-surface-border border-t-ink-muted" />
            </div>
          )}
          {imgStatus === "error" ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-void/50 p-3">
              <FileWarning size={24} className="mb-2 text-ink-muted/50" />
              <span className="text-[10px] font-medium text-ink-muted text-center leading-tight">Prévia indisponível</span>
            </div>
          ) : (
            <img 
              src={item.url} 
              alt={item.title} 
              loading="lazy"
              onLoad={() => setImgStatus("success")}
              onError={() => setImgStatus("error")}
              className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 ${imgStatus === "success" ? "opacity-100" : "opacity-0"}`}
            />
          )}
        </>
      )}
      
      {/* Degradê Inferior e Título */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-8 text-left">
        <p className="truncate text-xs font-semibold text-white/95">{item.title}</p>
        {item.subtitle && <p className="truncate text-[10px] font-medium text-white/70 mt-0.5">{item.subtitle}</p>}
      </div>
    </motion.button>
  );
}

/**
 * DOCUMENT VIEWER: Substitui o Lightbox. Permite visualizar e usar gestos (preparado para zoom nativo)
 */
function DocumentViewer({ 
  item, 
  onClose, 
  onShare 
}: { 
  item: GalleryItem; 
  onClose: () => void; 
  onShare: (item: GalleryItem) => void;
}) {
  // O Hook de gesto de Zoom nativo (Pinch-to-zoom) pode ser injetado aqui posteriormente 
  // diretamente alterando o 'transform' para máxima performance via CSS.
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl"
    >
      {/* Topbar do Viewer */}
      <div className="flex items-center justify-between p-5 pt-safe z-10">
        <button onClick={onClose} className="rounded-full bg-white/10 p-2.5 text-white backdrop-blur-md active:scale-95 transition-transform">
          <X size={20} />
        </button>
        <button onClick={() => onShare(item)} className="flex items-center gap-2 rounded-full bg-ice px-5 py-2.5 text-sm font-bold text-void active:scale-95 transition-transform">
          <Share2 size={16} /> Compartilhar
        </button>
      </div>

      {/* Área da Imagem - Preparada para Gestos (Touch) */}
      <div className="flex-1 overflow-hidden p-2 flex items-center justify-center relative touch-none">
        <img 
          src={item.url} 
          alt={item.title} 
          className="max-h-full max-w-full object-contain rounded-xl select-none"
          draggable="false"
        />
      </div>

      {/* Info Layer do Viewer */}
      <div className="bg-gradient-to-t from-black to-transparent p-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded bg-white/20 px-2 py-1 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-md">{item.category}</span>
          <span className="text-xs font-medium text-white/60">{new Date(item.date).toLocaleDateString("pt-BR")}</span>
        </div>
        <h2 className="text-xl font-bold text-white leading-tight">{item.title}</h2>
        {item.subtitle && <p className="text-sm font-medium text-white/70 mt-1">{item.subtitle}</p>}
      </div>
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
  
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"saude" | "pessoal">("saude");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<GalleryItem | null>(null);

  // Auto-abre modal de upload se solicitado pela URL
  useEffect(() => {
    if (searchParams.get("upload") === "true") {
      setIsUploadOpen(true);
    }
  }, [searchParams]);

  // Trava scroll do body quando o visualizador de documento está aberto
  useEffect(() => {
    if (viewingItem) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [viewingItem]);

  // Motor da Galeria (Sincronizado e Reativo via Dexie)
  const { items, isLoading } = useGaleria(selectedPerson || undefined);

  // Identificação do Usuário Ativo para a "Accent Layer"
  const activePersonObj = useMemo(() => persons.find((p: any) => p.id === selectedPerson), [persons, selectedPerson]);
  
  // ACCENT LAYER: Cor Dinâmica
  // Se tem pessoa, usa a cor dela. Se não, usa a cor do tema do módulo (Saúde = Esmeralda, Pessoal = Gelo/Azul)
  const themeColors = { saude: "#34D399", pessoal: "#38BDF8" }; // Esmeralda e Azul Claro
  const accentColor = activePersonObj?.color || themeColors[activeTab];

  // Agrupamento de dados por Mês/Ano
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
    trigger("vibrate"); // Haptic aprovado: Ação explícita do usuário
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, text: `Confira este documento: ${item.title}`, url: item.url });
      } else {
        window.open(item.url, "_blank");
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
    }
  };

  const handleOpenDocument = (item: GalleryItem) => {
    trigger("vibrate"); // Haptic aprovado: Abertura de contexto
    if (item.file_type === "pdf") {
      // PDF nativo abre no navegador ou visualizador padrão do sistema até criarmos o wrapper interno
      window.open(item.url, "_blank");
    } else {
      setViewingItem(item);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(6rem+env(safe-area-inset-bottom))]">
        
        {/* GALLERY HEADER */}
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/85 pt-safe backdrop-blur-xl transition-colors duration-300">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold text-ink-primary">Galeria</h1>
            <button className="h-10 w-10 flex items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 text-ink-primary">
              <Search size={18} />
            </button>
          </div>
            
          {/* PERSON SELECTOR (Avatares Inteligentes) */}
          <div className="mt-2 flex gap-3 overflow-x-auto px-5 pb-4 custom-scrollbar">
            <button
              onClick={() => setSelectedPerson(null)} // Removido haptic
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 transition-all duration-300 ${
                selectedPerson === null 
                  ? "bg-opacity-15 font-bold" 
                  : "border-surface-border/50 bg-surface-raised text-ink-muted"
              }`}
              style={selectedPerson === null ? { borderColor: accentColor, backgroundColor: `${accentColor}20`, color: accentColor } : {}}
            >
              <Images size={14} />
              <span className="text-sm">Todos</span>
            </button>
            
            {persons.map((p: any) => (
              <button
                key={p.id}
                onClick={() => setSelectedPerson(p.id)} // Removido haptic
                className={`flex shrink-0 items-center gap-2 rounded-full border pr-4 pl-1.5 py-1.5 transition-all duration-300 ${
                  selectedPerson === p.id 
                    ? "bg-opacity-15 font-bold" 
                    : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }`}
                style={selectedPerson === p.id ? { borderColor: accentColor, backgroundColor: `${accentColor}20`, color: accentColor } : {}}
              >
                {/* Lógica de Avatar da Pessoa */}
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

          {/* CATEGORY TABS (Linha indicadora herda a Accent Color) */}
          <div className="flex border-t border-surface-border/30">
            <button
              onClick={() => setActiveTab("saude")} // Removido haptic
              className={`relative flex-1 py-4 text-sm font-semibold transition-colors duration-300 ${
                activeTab === "saude" ? "text-ink-primary" : "text-ink-muted"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <HeartPulse size={16} className={activeTab === "saude" ? "" : "opacity-70"} style={activeTab === "saude" ? { color: accentColor } : {}} /> Saúde
              </div>
              {activeTab === "saude" && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: accentColor }} />
              )}
            </button>
            <button
              onClick={() => setActiveTab("pessoal")} // Removido haptic
              className={`relative flex-1 py-4 text-sm font-semibold transition-colors duration-300 ${
                activeTab === "pessoal" ? "text-ink-primary" : "text-ink-muted"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Shield size={16} className={activeTab === "pessoal" ? "" : "opacity-70"} style={activeTab === "pessoal" ? { color: accentColor } : {}} /> Pessoal
              </div>
              {activeTab === "pessoal" && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: accentColor }} />
              )}
            </button>
          </div>
        </header>

        {/* GALLERY CONTENT */}
        <section className="px-5 pt-6">
          {/* Se está carregando E a lista está vazia (primeiro load local), exibe o Skeleton inteligente */}
          {isLoading && items.length === 0 ? (
            <GallerySkeleton />
          ) : Object.keys(groupedFilteredItems).length === 0 ? (
            /* Empty State inteligente baseado no contexto da busca */
            <GalleryEmptyState activeTab={activeTab} personName={activePersonObj?.name} />
          ) : (
            /* Grid de 2 Colunas Premium */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {Object.entries(groupedFilteredItems).map(([mesAno, groupItems]) => (
                <div key={mesAno} className="mb-8">
                  <h2 className="mb-4 pl-1 text-[13px] font-bold uppercase tracking-wider text-ink-muted">{mesAno}</h2>
                  <div className="grid grid-cols-2 gap-3.5">
                    {groupItems.map((item) => (
                      <DocumentPreviewCard 
                        key={item.id} 
                        item={item} 
                        accentColor={accentColor} 
                        onClick={handleOpenDocument} 
                      />
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </section>

        {/* MODAIS ORQUESTRADOS */}
        <UploadGaleriaModal 
          isOpen={isUploadOpen} 
          onClose={() => setIsUploadOpen(false)} 
        />

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
