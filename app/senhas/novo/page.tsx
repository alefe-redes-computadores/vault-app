import { useState } from "react";
import { guessWebsiteFromTitle, getFaviconUrl, normalizeText } from "@/lib/utils/credential-helper";
import { KeyRound } from "lucide-react";

export function CredentialForm() {
  const [title, setTitle] = useState("");
  const [website, setWebsite] = useState("");
  const [faviconError, setFaviconError] = useState(false);

  // Quando o usuário digita o título
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);

    // Auto-preenche o site apenas se o campo de site estiver vazio ou se o usuário estiver digitando do zero
    if (!website || website.startsWith("https://")) {
      const guessed = guessWebsiteFromTitle(val);
      if (guessed) {
        setWebsite(guessed);
        setFaviconError(false); // Reseta erro do ícone ao mudar
      }
    }
  };

  const faviconSrc = getFaviconUrl(website);

  return (
    <div className="space-y-4">
      {/* Visualizador do Ícone Padronizado com Fallback */}
      <div className="flex justify-center mb-6">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-surface-border bg-surface-card shadow-sm overflow-hidden">
          {faviconSrc && !faviconError ? (
            <img 
              src={faviconSrc} 
              alt="Ícone do site" 
              className="h-8 w-8 object-contain"
              onError={() => setFaviconError(true)}
            />
          ) : (
            // Fallback elegante se não encontrar o ícone ou o site
            <div className="text-ice flex items-center justify-center">
              <KeyRound size={28} />
            </div>
          )}
        </div>
      </div>

      {/* Input de Título */}
      <div>
        <label className="text-xs font-medium text-ink-muted">Título (ex: Itaú, Netflix)</label>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Nome do serviço"
          className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-ink-primary"
        />
      </div>

      {/* Input de Site (Auto-preenchido) */}
      <div>
        <label className="text-xs font-medium text-ink-muted">Site</label>
        <input
          type="text"
          value={website}
          onChange={(e) => {
            setWebsite(e.target.value);
            setFaviconError(falses);
          }}
          placeholder="https://exemplo.com.br"
          className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-ink-primary"
        />
      </div>
    </div>
  );
}
