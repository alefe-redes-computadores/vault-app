import { supabase } from "./client";
import { v4 as uuidv4 } from "uuid";

const BUCKET_NAME = "documents";

export async function uploadFile(
  userId: string,
  file: File,
  folder: string = "docs"
): Promise<{ url: string; error: Error | null }> {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${uuidv4()}.${fileExt}`;
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
    return { url: "", error: error as Error };
  }
}

export async function deleteFile(url: string): Promise<{ error: Error | null }> {
  try {
    // Extrai o path da URL
    const path = url.split("/").slice(-4).join("/");
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function listFiles(userId: string, folder: string = "docs") {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(`${userId}/${folder}`);

  return { data, error };
}