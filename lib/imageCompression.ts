Export async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<File> {
  // Se não for imagem (ex: PDF), retorna o arquivo original sem mexer
  if (!file.type.startsWith("image/")) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Redimensiona proporcionalmente se ultrapassar a largura máxima
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file); // Fallback caso o canvas falhe
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            // Retorna como um novo arquivo comprimido mantendo o nome original
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

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