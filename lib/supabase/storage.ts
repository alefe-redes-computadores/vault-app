import { supabase } from "./client";

const DEFAULT_BUCKET = "documents";

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
 * Faz upload de um arquivo para o Supabase Storage (suporta avatars ou documents)
 */
export async function uploadFile(
  userId: string,
  file: File,
  folder: string = "docs"
): Promise<{ url: string; error: Error | null }> {
  try {
    // CORREÇÃO: Se a pasta for 'avatars', usamos o bucket 'avatars'. Caso contrário, 'documents'.
    const bucketName = folder === "avatars" ? "avatars" : DEFAULT_BUCKET;

    const fileExt = file.name.split(".").pop();
    const fileName = `${generateId()}.${fileExt}`;
    
    // Se for avatar, salvamos direto na pasta do usuário para simplificar o caminho
    const filePath = folder === "avatars" ? `${userId}/${fileName}` : `${userId}/${folder}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true, // Substitui se já existir
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    console.error("Erro no upload:", error);
    return { url: "", error: error as Error };
  }
}

/**
 * Deleta um arquivo do Supabase Storage a partir da URL pública
 */
export async function deleteFile(url: string, bucket: string = DEFAULT_BUCKET): Promise<{ error: Error | null }> {
  try {
    let path: string;

    if (url.includes('/storage/v1/object/public/')) {
      const parts = url.split('/storage/v1/object/public/');
      if (parts.length === 2) {
        path = parts[1];
        const pathParts = path.split('/');
        if (pathParts.length > 1 && (pathParts[0] === DEFAULT_BUCKET || pathParts[0] === 'avatars')) {
          bucket = pathParts[0]; // Descobre o bucket pela URL
          pathParts.shift(); 
          path = pathParts.join('/');
        }
      } else {
        const segments = url.split('/').filter(s => s);
        const fileName = segments.pop();
        const userId = segments.pop();
        path = `${userId}/${fileName}`;
      }
    } else {
      const segments = url.split('/').filter(s => s);
      if (segments[0] === DEFAULT_BUCKET || segments[0] === 'avatars') {
        bucket = segments[0];
        segments.shift();
      }
      path = segments.join('/');
    }

    if (!path || path.length < 5) {
      console.warn('Caminho inválido para deletar arquivo:', url);
      return { error: new Error('Caminho inválido') };
    }

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    return { error: error as Error };
  }
}

export async function deleteFiles(urls: string[]): Promise<{ errors: Error[] }> {
  const errors: Error[] = [];
  for (const url of urls) {
    const { error } = await deleteFile(url);
    if (error) errors.push(error);
  }
  return { errors };
}

export async function listFiles(userId: string, folder: string = "docs") {
  const { data, error } = await supabase.storage
    .from(DEFAULT_BUCKET)
    .list(`${userId}/${folder}`);

  return { data, error };
}

export async function deleteFolder(userId: string, folder: string = "docs"): Promise<{ error: Error | null }> {
  try {
    const { data, error: listError } = await listFiles(userId, folder);
    if (listError) throw listError;
    if (!data || data.length === 0) return { error: null };

    const filePaths = data.map(file => `${userId}/${folder}/${file.name}`);
    const { error } = await supabase.storage
      .from(DEFAULT_BUCKET)
      .remove(filePaths);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Erro ao deletar pasta:', error);
    return { error: error as Error };
  }
}
