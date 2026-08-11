import { RgbaColor } from '../textures/RgbaColor';

export default function rgbaToArgb1555(
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

  const rVal = Math.round((red * 31) / 255);
  const gVal = Math.round((green * 31) / 255);
  const bVal = Math.round((blue * 31) / 255);
  const aVal = Math.round(alpha / 255);

  return (aVal << 15) | (rVal << 10) | (gVal << 5) | bVal;
}
