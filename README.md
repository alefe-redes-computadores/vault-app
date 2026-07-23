# Vault — Seus documentos, sempre à mão

**Vault** é um aplicativo local‑first de gestão de documentos pessoais e familiares, organizado por **pessoas** e **categorias** (Saúde, Pessoal, Empresa, Outros). Ele centraliza documentos como RG, CPF, CNH, receitas médicas, prontuários, laudos, certificados, medicamentos e renovações, funcionando **100% offline** (IndexedDB) e sincronizando com Supabase quando online. A interface é orientada a **cards** com cores por categoria, favoritos, busca, anexos e um módulo completo de saúde.

> 🔗 **Link de produção:**



 [https://vault-app-ebon.vercel.app/]

---
## 📦 Índice

- [📸 Screenshots](#-screenshots)
- [✨ Funcionalidades](#-funcionalidades)
- [🛠️ Stack Tecnológica](#️-stack-tecnológica)
- [📂 Estrutura de Dados](#-estrutura-de-dados)
- [📱 Telas Principais](#-telas-principais)
- [🏗️ Arquitetura Local‑First](#️-arquitetura-localfirst)
- [🔐 Autenticação](#-autenticação)
- [📦 Instalação e Configuração](#-instalação-e-configuração)
- [🚀 Deploy](#-deploy)
- [📲 PWA e APK (Capacitor)](#-pwa-e-apk-capacitor)
- [📋 Roadmap e Melhorias Futuras](#-roadmap-e-melhorias-futuras)
- [🤝 Contribuição](#-contribuição)
- [📄 Licença](#-licença)

---

## 📸 Screenshots

| Login | Home | Documentos | Detalhes |
|-------|------|-----------|----------|
| ![Login](https://vault-app.vercel.app/icon-512x512.png) | ![Home](https://vault-app.vercel.app/icon-512x512.png) | ![Documentos](https://vault-app.vercel.app/icon-512x512.png) | ![Detalhes](https://vault-app.vercel.app/icon-512x512.png) |

> **Nota:** As imagens acima são ilustrativas. Substitua pelos prints reais do seu app.

---

## ✨ Funcionalidades

### 🔐 Autenticação
- Login com e-mail/senha (Supabase Auth)
- Login com Google OAuth via **popup** (não redireciona a página)
- Página de callback que fecha a janela e atualiza o estado automaticamente
- Proteção de rotas

### 👥 Pessoas
- Cadastro com nome, e-mail, telefone e foto (avatar do Google)
- Autopreenchimento com dados do Google
- Lista horizontal de pessoas na home com filtro por pessoa em todas as telas

### 📄 Documentos (Cards)
- Cada documento é um **card** com informações resumidas
- **Cores por categoria**: Saúde (rosa), Pessoal (azul), Empresa (amarelo), Outros (cinza)
- Na tela inicial: **até 3 cards por categoria** da pessoa selecionada
- Botão **"Ver mais"** expande a categoria
- **Favoritos** em destaque
- Badge de anexo e badge de sincronização

### 🗂️ Tipos de Documentos
| Tipo | Campos obrigatórios |
|------|---------------------|
| **RG** | número, data emissão, validade, órgão emissor |
| **CPF** | número |
| **CNH** | número, categoria, data emissão, validade |
| **Certificado** | instituição, curso, duração |
| **Receita** | medicamento, dosagem, médico, próxima renovação |
| **Prontuário** | hospital, médico, data, especialidade |
| **Laudo** | médico, especialidade, hospital, data |
| **Encaminhamento** | quem encaminhou, motivo |

### 📎 Anexos
- Upload via **câmera** ou **galeria**
- Armazenamento no Supabase Storage
- **Modal de visualização**: miniatura ampliada, nome editável, download

### 💊 Módulo Saúde
- Lista de medicamentos com alerta de renovação (dias restantes)
- Cadastro de medicamentos com dosagem, médico, próxima renovação
- Histórico de renovações por medicamento
- Anexo de receitas e comprovantes

### 🔄 Sincronização Local‑First
- Fila de sincronização (`syncQueue`) para todas as operações
- Processamento em background quando online
- Detecção de conectividade

### 🎨 UI e Experiência
- Splash Screen personalizada
- Loading Skeletons em todas as listas
- Page Transitions (animações entre páginas)
- Toasts com animações
- Haptic feedback em todas as interações
- Design escuro com glassmorphism e cantos arredondados

### 📱 PWA e APK
- PWA com manifest, service worker e meta tags
- APK Android via Capacitor e GitHub Actions

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | Next.js 14 (App Router) + TypeScript |
| **Estilização** | TailwindCSS + design system próprio |
| **Banco local** | Dexie.js (IndexedDB) |
| **Backend/Cloud** | Supabase (Auth, Database, Storage) |
| **PWA** | Manifest + service worker |
| **Mobile** | Capacitor (Android) + GitHub Actions |
| **Animações** | Framer Motion |
| **Ícones** | Lucide React |
| **Datas** | date-fns |

---

## 📂 Estrutura de Dados

### Dexie (IndexedDB) — Tabelas principais

```ts
// PESSOAS
interface Person {
  id?: number;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

// DOCUMENTOS
interface Document {
  id?: number;
  person_id: number;
  category_id: 'saude' | 'pessoal' | 'empresa' | 'outros';
  type: 'rg' | 'cpf' | 'cnh' | 'certificado' | 'receita' | 'prontuario' | 'laudo' | 'encaminhamento' | 'outro';
  title: string;
  description?: string;
  metadata: Record<string, any>;
  attachments: Attachment[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

// MEDICAMENTOS
interface Medicamento {
  id?: number;
  document_id: number;
  nome: string;
  dosagem: string;
  medico: string;
  farmacia?: string;
  data_receita: string;
  proxima_renovacao: string;
  observacoes?: string;
}

// FILA DE SINCRONIZAÇÃO
interface SyncQueueItem {
  id?: number;
  table: 'persons' | 'documents' | 'medicamentos' | 'renovacoes';
  operation: 'add' | 'update' | 'delete';
  payload: Record<string, unknown>;
  created_at: string;
}

## 📱 Telas Principais

| Rota | Descrição |
|------|-----------|
| `/` | Dashboard com pessoas + cards por categoria |
| `/login` | Tela de login (e-mail/senha + Google) |
| `/auth/callback` | Callback para autenticação OAuth (popup) |
| `/documentos` | Lista completa de documentos com busca |
| `/favoritos` | Lista de documentos favoritados |
| `/novo` | Cadastro de documento (campos dinâmicos) |
| `/[id]` | Detalhes do documento com modal de anexos |
| `/[id]/editar` | Edição de documento |
| `/categoria/[id]` | "Ver mais" por categoria |
| `/pessoas/novo` | Cadastro de pessoa |
| `/perfil` | Perfil do usuário (logout, limpar dados) |
| `/saude/medicamentos` | Lista de medicamentos |
| `/saude/medicamentos/novo` | Cadastro de medicamento |
| `/saude/medicamentos/[id]` | Detalhes do medicamento com renovações |

## 📱 Telas Principais

| Rota | Descrição |
|------|-----------|
| `/` | Dashboard com pessoas + cards por categoria |
| `/login` | Tela de login (e-mail/senha + Google) |
| `/auth/callback` | Callback para autenticação OAuth (popup) |
| `/documentos` | Lista completa de documentos com busca |
| `/favoritos` | Lista de documentos favoritados |
| `/novo` | Cadastro de documento (campos dinâmicos) |
| `/[id]` | Detalhes do documento com modal de anexos |
| `/[id]/editar` | Edição de documento |
| `/categoria/[id]` | "Ver mais" por categoria |
| `/pessoas/novo` | Cadastro de pessoa |
| `/perfil` | Perfil do usuário (logout, limpar dados) |
| `/saude/medicamentos` | Lista de medicamentos |
| `/saude/medicamentos/novo` | Cadastro de medicamento |
| `/saude/medicamentos/[id]` | Detalhes do medicamento com renovações |

## 🚀 Deploy

### Deploy na Vercel (gratuito)

1. Faça o push do código para o GitHub.
2. Acesse [vercel.com](https://vercel.com) e importe o repositório.
3. Adicione as variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Clique em **Deploy**.

O deploy é automático a cada push na branch `main`.

---

## 📲 PWA e APK (Capacitor)

### PWA
- O app é um PWA instalável no celular.
- O navegador exibirá um banner "Instalar aplicativo" ou "Adicionar à tela inicial".
- Funciona offline (cache do service worker).

### APK Android (via GitHub Actions)

1. O workflow `.github/workflows/build-android.yml` é acionado a cada push na `main`.
2. Ele builda o Next.js com `output: "export"` (usando `next.config.export.js`).
3. Sincroniza com o Capacitor e compila o APK.
4. O APK fica disponível em **Actions → Artifacts → Vault-App**.

#### Comandos manuais (opcional)
```bash
# Build com export
npm run build:export

# Sincronizar Capacitor
npx cap sync android

# Gerar APK (via Gradle)
cd android && ./gradlew assembleDebug

## 🤝 Contribuição

Contribuições são bem‑vindas! Siga os passos:

1. Fork o projeto.
2. Crie uma branch para sua feature (`git checkout -b feat/nova-feature`).
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova feature'`).
4. Push para a branch (`git push origin feat/nova-feature`).
5. Abra um Pull Request.

---

## 📄 Licença

Este projeto está sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---

**Feito com ❤️ por Alefe Gomes e contribuidores.**

---

## 📎 Links Úteis

- [App em produção](https://vault-app.vercel.app)
- [Repositório GitHub](https://github.com/alefe-redes-computadores/vault-app)
- [Supabase Dashboard](https://app.supabase.com)
- [Vercel Dashboard](https://vercel.com)
- [Capacitor Docs](https://capacitorjs.com/docs)

---

*Última atualização: 17 de julho de 2026*

## 🤝 Contribuição

Contribuições são bem‑vindas! Siga os passos:

1. Fork o projeto.
2. Crie uma branch para sua feature (`git checkout -b feat/nova-feature`).
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova feature'`).
4. Push para a branch (`git push origin feat/nova-feature`).
5. Abra um Pull Request.

---

## 📄 Licença

Este projeto está sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---

**Feito com ❤️ por Alefe Gomes e contribuidores.**

---

## 📎 Links Úteis

- [App em produção](https://vault-app.vercel.app)
- [Repositório GitHub](https://github.com/alefe-redes-computadores/vault-app)
- [Supabase Dashboard](https://app.supabase.com)
- [Vercel Dashboard](https://vercel.com)
- [Capacitor Docs](https://capacitorjs.com/docs)

---

*Última atualização: 17 de julho de 2026*