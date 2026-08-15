/**
 * Gera uma miniatura ultraleve (Thumbnail) focada em performance para listas e grids.
 * Tamanho máximo de 400px e compressão agressiva (0.5).
 */
export async function generateThumbnail(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }
  
  // Cria um novo arquivo com o prefixo 'thumb_'
  const compressedBlob = await compressImage(file, 400, 0.5);
  return new File([compressedBlob], `thumb_${file.name}`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
