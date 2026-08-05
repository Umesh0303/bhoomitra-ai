// Browser-side image compression — keeps uploads small for rural networks.

export type CompressedImage = {
  file: File;
  width: number;
  height: number;
  bytes: number;
  previewUrl: string;
};

const MAX_EDGE = 1280;
const QUALITY = 0.72;

export async function compressImage(file: File): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    return {
      file,
      width: 0,
      height: 0,
      bytes: file.size,
      previewUrl: URL.createObjectURL(file),
    };
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return { file, width, height, bytes: file.size, previewUrl: URL.createObjectURL(file) };
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  if (!blob) {
    return { file, width, height, bytes: file.size, previewUrl: URL.createObjectURL(file) };
  }

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  const out = new File([blob], name, { type: "image/jpeg" });
  return { file: out, width, height, bytes: out.size, previewUrl: URL.createObjectURL(out) };
}
