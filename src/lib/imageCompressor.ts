export async function compressImage(base64: string, maxKB = 250, initialQuality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      const MAX_DIM = 1400;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      let q = initialQuality;
      let result = canvas.toDataURL('image/jpeg', q);

      while (result.length * 0.75 > maxKB * 1024 && q > 0.15) {
        q = Math.max(q - 0.08, 0.15);
        result = canvas.toDataURL('image/jpeg', q);
      }

      resolve(result);
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}
