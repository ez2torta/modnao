import { RgbaColor } from '../textures/RgbaColor';

export default function rgbaToArgb4444(
  colorOrR: RgbaColor | number,
  g?: number,
  b?: number,
  a?: number
): number {
  let red: number, green: number, blue: number, alpha: number;

  if (typeof colorOrR === 'object' && colorOrR !== null) {
    red = colorOrR.r;
    green = colorOrR.g;
    blue = colorOrR.b;
    alpha = colorOrR.a;
  } else {
    red = colorOrR;
    green = g ?? 0;
    blue = b ?? 0;
    alpha = a ?? 255;
  }

  const rVal = Math.round((red * 15) / 255);
  const gVal = Math.round((green * 15) / 255);
  const bVal = Math.round((blue * 15) / 255);
  const aVal = Math.round((alpha * 15) / 255);

  return (aVal << 12) | (rVal << 8) | (gVal << 4) | bVal;
}
