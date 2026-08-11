/**
 * getMipmapOffset.ts - Calcula el offset en bytes de los sub-niveles de mipmaps
 * que preceden a la imagen principal de tamaño (width x height) en PowerVR Dreamcast.
 *
 * En texturas con Mipmaps (Type 2 y Type 4), la GPU PowerVR almacena primero
 * los niveles reducidos (1x1, 2x2, 4x4 ... hasta (W/2)x(H/2)) antes de la textura base.
 */

export const TWIDDLED_MIPMAP_TEXTURE_ENCODE_TYPE = 2;
export const VQ_MIPMAP_TEXTURE_ENCODE_TYPE = 4;

export default function getMipmapOffset(
  width: number,
  height: number,
  isVq: boolean = false
): number {
  if (width <= 2 || height <= 2) {
    return 0;
  }

  if (!isVq) {
    // Para texturas de 16-bit en PowerVR Katana:
    // Los niveles 1x1, 2x2, ... (W/2)x(H/2) ocupan exactamente:
    // sum_{k=0}^{n-1} 4^k * 2 = ((width * height - 1) / 3) * 2 bytes
    return Math.floor((width * height - 1) / 3) * 2;
  }

  // En VQ los mipmaps previos son índices de 1 byte (1x1 y 2x2 comparten 1 bloque de 2x2)
  return 1 + Math.floor((Math.floor((width * height) / 4) - 1) / 3);
}
