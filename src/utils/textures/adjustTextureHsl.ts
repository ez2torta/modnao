import adjustHslOfRgba from '../color-conversions/adjustHslOfRgba';
import offscreenCanvasToDataUrl from '../offscreenCanvasToDataUrl';
import HslValues from './HslValues';
import { RgbaColor } from './RgbaColor';

export default async function adjustTextureHsl(
  sourceImageData: ImageData,
  hsl: HslValues
) {
  const { h, s, l } = hsl;
  const canvas = new OffscreenCanvas(
    sourceImageData.width,
    sourceImageData.height
  );
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
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

  // data must be rotated for Naomi format
  // @TODO considerations for precalculating this in pipeline

  const rotatedCanvas = new OffscreenCanvas(
    sourceImageData.width,
    sourceImageData.height
  );
  const rotatedCtx = rotatedCanvas.getContext(
    '2d'
  ) as OffscreenCanvasRenderingContext2D;

  rotatedCtx.translate(canvas.width / 2, canvas.height / 2);

  rotatedCtx.rotate((-90 * Math.PI) / 180);
  rotatedCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

  const dataUrl = await offscreenCanvasToDataUrl(rotatedCanvas);
  return dataUrl;
}
