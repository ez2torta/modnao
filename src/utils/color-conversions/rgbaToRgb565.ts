import { RgbaColor } from '../textures/RgbaColor';

export default function rgbaToRgb565(
  colorOrR: RgbaColor | number,
  g?: number,
  b?: number
): number {
  let red: number, green: number, blue: number;

  if (typeof colorOrR === 'object' && colorOrR !== null) {
    red = colorOrR.r;
    green = colorOrR.g;
    blue = colorOrR.b;
  } else {
    red = colorOrR;
    green = g ?? 0;
    blue = b ?? 0;
  }

  const rVal = red >> 3;
  const gVal = green >> 2;
  const bVal = blue >> 3;

  return (rVal << 11) | (gVal << 5) | bVal;
}
