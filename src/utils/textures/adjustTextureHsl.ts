import adjustHslOfRgba from '../color-conversions/adjustHslOfRgba';
import HslValues from './HslValues';
import { RgbaColor } from './RgbaColor';

export default async function adjustTextureHsl(
  sourceImageData: ImageData,
  hsl: HslValues
) {
  const { h, s, l } = hsl;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  canvas.width = sourceImageData.width;
  canvas.height = sourceImageData.height;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const sourceData = sourceImageData.data;

  /**
   * colors tend to be within ranges, so create a
   * cache of hashed rgba hsl values (`r,g,b`) to
   * value to prevent re-calculation of hsl.
   *
   **/
  const conversions = new Map<string, RgbaColor>();

  for (let i = 0; i < sourceData.length; i += 4) {
    const color = {
      r: sourceData[i],
      g: sourceData[i + 1],
      b: sourceData[i + 2],
      a: sourceData[i + 3]
    };

    const data = imageData.data;
    const rgbHash = `${color.r},${color.g},${color.b}`;
    if (!conversions.has(rgbHash)) {
      conversions.set(rgbHash, adjustHslOfRgba(color, h, s, l));
    }
    const newRgba = conversions.get(rgbHash) as RgbaColor;
    data[i] = newRgba.r;
    data[i + 1] = newRgba.g;
    data[i + 2] = newRgba.b;
    // hash disregards alpha since this doesn't change;
    // saves possible ops/RAM of cache'ing
    data[i + 3] = color.a;
  }

  ctx.putImageData(imageData, 0, 0);

  // data is rotated in Naomi texture format compared to
  // mapping and this is not adjusted at root for
  // ease-of-export on this first iteration
  const rotatedCanvas = document.createElement('canvas');
  rotatedCanvas.width = canvas.width;
  rotatedCanvas.height = canvas.height;
  const rotatedCtx = rotatedCanvas.getContext('2d') as CanvasRenderingContext2D;
  rotatedCtx.translate(canvas.width / 2, canvas.height / 2);

  rotatedCtx.rotate((-90 * Math.PI) / 180);
  rotatedCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

  return rotatedCanvas.toDataURL();
}
