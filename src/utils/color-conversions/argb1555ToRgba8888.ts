export default function argb1555ToRgba8888(argb1555: number) {
  const a = (argb1555 & 0x8000) ? 255 : 0;
  const r5 = (argb1555 >> 10) & 0x1f;
  const g5 = (argb1555 >> 5) & 0x1f;
  const b5 = argb1555 & 0x1f;

  // Expansión simétrica de 5 bits a 8 bits: (v << 3) | (v >> 2) mapea 0->0 y 31->255
  const r = (r5 << 3) | (r5 >> 2);
  const g = (g5 << 3) | (g5 >> 2);
  const b = (b5 << 3) | (b5 >> 2);

  return { r, g, b, a };
}
