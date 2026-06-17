export async function captureFrameAsJpeg(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  options: { maxWidth: number; quality: number },
): Promise<Blob> {
  const { maxWidth, quality } = options;
  const width =
    source instanceof HTMLVideoElement
      ? source.videoWidth
      : source instanceof HTMLCanvasElement
        ? source.width
        : source.naturalWidth;
  const height =
    source instanceof HTMLVideoElement
      ? source.videoHeight
      : source instanceof HTMLCanvasElement
        ? source.height
        : source.naturalHeight;

  if (!width || !height) {
    throw new Error("No video frame available yet.");
  }

  const scale = width > maxWidth ? maxWidth / width : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to encode JPEG."));
      },
      "image/jpeg",
      quality,
    );
  });
}

export async function fileToJpegBlob(
  file: File,
  options: { maxWidth: number; quality: number },
): Promise<Blob> {
  if (file.type.startsWith("image/")) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Could not load image."));
        img.src = url;
      });
      return captureFrameAsJpeg(img, options);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  throw new Error("Unsupported file type. Choose an image.");
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
