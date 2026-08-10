import fs from 'fs';
import path from 'path';
import encodeZMortonPosition from './parse/encodeZMortonPosition';
import rgbaToArgb1555 from '../color-conversions/rgbaToArgb1555';
import rgba8888TargetOps from '../color-conversions/rgba8888TargetOps';

describe('DM08CAB Roundtrip (Cable & Ruby Heart 512x512 ARGB1555)', () => {
  it('should decode and re-encode ARGB1555 Morton-Z textures with 100% bit-exact match', () => {
    const width = 512;
    const height = 512;
    const testBuffer = Buffer.alloc(width * height * 2);

    // Llenar con un patrón determinista de colores ARGB1555
    for (let i = 0; i < width * height; i++) {
      const a = (i % 7 === 0) ? 0 : 1;
      const r = (i * 3) % 32;
      const g = (i * 5) % 32;
      const b = (i * 11) % 32;
      const val16 = (a << 15) | (r << 10) | (g << 5) | b;
      testBuffer.writeUInt16LE(val16, i * 2);
    }

    // 1. Decodificar a RGBA8888 con entrelazado Morton-Z
    const pixels = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) {
      const yOffset = width * y;
      const sourceY = height - 1 - y;
      for (let x = 0; x < width; x++) {
        const offsetDrawn = encodeZMortonPosition(x, sourceY);
        const val16 = testBuffer.readUInt16LE(offsetDrawn * 2);
        const color = rgba8888TargetOps.ARGB1555(val16);
        const idx = (yOffset + x) * 4;
        pixels[idx] = color.r;
        pixels[idx + 1] = color.g;
        pixels[idx + 2] = color.b;
        pixels[idx + 3] = color.a;
      }
    }

    // 2. Re-codificar a ARGB1555 con entrelazado Morton-Z
    const reencoded = Buffer.alloc(width * height * 2);
    for (let y = 0; y < height; y++) {
      const yOffset = width * y;
      const sourceY = height - 1 - y;
      for (let x = 0; x < width; x++) {
        const offsetDrawn = encodeZMortonPosition(x, sourceY);
        const idx = (yOffset + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const a = pixels[idx + 3];
        const val16 = rgbaToArgb1555({ r, g, b, a });
        reencoded.writeUInt16LE(val16, offsetDrawn * 2);
      }
    }

    // Validar coincidencia bit a bit
    expect(reencoded.equals(testBuffer)).toBe(true);
  });
});
