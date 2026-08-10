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
    // ((width * height - 4) / 3) * 2 + 24 bytes
    const count = Math.floor((width * height - 4) / 3);
    return count * 2 + 24;
  }

  // En VQ los mipmaps previos son índices de 1 byte
  const count = Math.floor((width * height - 4) / 3);
  return Math.floor(count / 4) + 6;
}
