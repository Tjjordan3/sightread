import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

/**
 * Capture a JPEG still via Capacitor Camera on native, or return null on web
 * (callers should keep using getUserMedia / file input there).
 */
export async function captureNativePhotoJpeg(): Promise<Blob | null> {
  if (!Capacitor.isNativePlatform()) return null;

  const photo = await Camera.getPhoto({
    quality: 70,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
    correctOrientation: true,
  });

  if (!photo.webPath) return null;
  const response = await fetch(photo.webPath);
  return response.blob();
}

export function isNativeCameraAvailable(): boolean {
  return Capacitor.isNativePlatform();
}
