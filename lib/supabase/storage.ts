import { supabase } from "./client";

const BUCKET_NAME = "documents";

// Gerador de UUID compatível
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Faz upload de um arquivo para o Supabase Storage
 */
export async function uploadFile(
  userId: string,
  file: File,
  folder: string = "docs"
): Promise<{ url: string; error: Error | null }> {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${generateId()}.${fileExt}`;
    const filePath = `${userId}/${folder}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    console.error("Erro no upload:", error);
    return { url: "", error: error as Error };
  }
}

/**
 * Deleta um arquivo do Supabase Storage a partir da URL pública
 * CORRIGIDO: extrai corretamente o caminho relativo dentro do bucket
 */
export async function deleteFile(url: string): Promise<{ error: Error | null }> {
  try {
    // A URL pública tem o formato:
    // https://[project].supabase.co/storage/v1/object/public/documents/userId/folder/filename
    // Ou: documents/userId/folder/filename (quando é relativo)
    // Precisamos extrair o caminho relativo dentro do bucket (ex: userId/folder/filename)

    let path: string;

    // Se a URL contém o padrão do Supabase
    if (url.includes('/storage/v1/object/public/')) {
      // Extrai tudo após 'public/'
      const parts = url.split('/storage/v1/object/public/');
      if (parts.length === 2) {
        // O resultado é 'documents/userId/folder/filename' ou 'documents/userId/folder/filename'
        path = parts[1];
        // Remove o nome do bucket do início (ex: 'documents/userId/...' → 'userId/...')
        const pathParts = path.split('/');
        if (pathParts.length > 1 && pathParts[0] === BUCKET_NAME) {
          pathParts.shift(); // remove o bucket
          path = pathParts.join('/');
        }
      } else {
        // Fallback: pega os últimos 3 segmentos (userId/folder/filename)
        const segments = url.split('/').filter(s => s);
        const fileName = segments.pop();
        const folder = segments.pop();
        const userId = segments.pop();
        path = `${userId}/${folder}/${fileName}`;
      }
    } else {
      // Se for uma URL relativa, tenta extrair o caminho
      const segments = url.split('/').filter(s => s);
      // Se começa com o nome do bucket, remove
      if (segments[0] === BUCKET_NAME) {
        segments.shift();
      }
      path = segments.join('/');
    }

    // Fallback seguro: se path estiver vazio ou inválido, retorna erro
    if (!path || path.length < 5) {
      console.warn('Caminho inválido para deletar arquivo:', url);
      return { error: new Error('Caminho inválido') };
    }

    console.log(`🗑️ Deletando arquivo: ${path}`);

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    return { error: error as Error };
  }
}

/**
 * Deleta múltiplos arquivos a partir de suas URLs
 */
export async function deleteFiles(urls: string[]): Promise<{ errors: Error[] }> {
  const errors: Error[] = [];
  for (const url of urls) {
    const { error } = await deleteFile(url);
    if (error) errors.push(error);
  }
  return { errors };
}

/**
 * Lista arquivos de uma pasta
 */
export async function listFiles(userId: string, folder: string = "docs") {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(`${userId}/${folder}`);

  return { data, error };
}

/**
 * Deleta todos os arquivos de uma pasta (útil para limpar dados de um usuário)
 */
export async function deleteFolder(userId: string, folder: string = "docs"): Promise<{ error: Error | null }> {
  try {
    const { data, error: listError } = await listFiles(userId, folder);
    if (listError) throw listError;
    if (!data || data.length === 0) return { error: null };

    const filePaths = data.map(file => `${userId}/${folder}/${file.name}`);
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filePaths);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Erro ao deletar pasta:', error);
    return { error: error as Error };
  }
}