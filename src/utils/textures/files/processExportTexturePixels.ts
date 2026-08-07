import {
  rgbaToArgb1555,
  rgbaToArgb4444,
  rgbaToRgb565
} from '@/utils/color-conversions';
import encodeZMortonRectanglePosition from '../parse/encodeZMortonRectanglePosition';
import { RgbaColor } from '../RgbaColor';
import { decodeZMortonPosition } from '../serialize';
import { TextureColorFormat } from '../TextureColorFormat';

const conversionDict: Record<TextureColorFormat, (color: RgbaColor) => number> =
  {
    RGB565: rgbaToRgb565,
    ARGB1555: rgbaToArgb1555,
    ARGB4444: rgbaToArgb4444,
    RGB555: () => 0,
    ARGB8888: () => 0
  };

const COLOR_SIZE = 2;

export default function processExportTexturePixels({
  pixelColors,
  width,
  height,
  baseLocation,
  ramOffset,
  colorFormat,
  textureBuffer,
  isRectangleTwiddledTexture = false
}: {
  pixelColors: Uint8Array;
  width: number;
  height: number;
  baseLocation: number;
  ramOffset: number;
  colorFormat: TextureColorFormat;
  textureBuffer: SharedArrayBuffer;
  isRectangleTwiddledTexture?: boolean;
}) {
  const buffer = new Uint8Array(textureBuffer);
  for (let y = 0; y < height; y++) {
    const yOffset = width * y;
    for (let offset = yOffset; offset < yOffset + width; offset++) {
      const [positionX, positionY] = isRectangleTwiddledTexture
        ? [offset - yOffset, y]
        : decodeZMortonPosition(offset);
      const positionOffset = (height - 1 - positionY) * width + positionX;
      const colorOffset = positionOffset * 4;

      if (colorOffset + 3 >= pixelColors.length) {
        continue;
      }

      const color = {
        r: pixelColors[colorOffset],
        g: pixelColors[colorOffset + 1],
        b: pixelColors[colorOffset + 2],
        a: pixelColors[colorOffset + 3]
      };

      const conversionOp = conversionDict[colorFormat];
      const texturePosition = isRectangleTwiddledTexture
        ? encodeZMortonRectanglePosition(positionX, positionY, width, height)
        : offset;
      const offsetWritten =
        baseLocation - ramOffset + texturePosition * COLOR_SIZE;

      if (offsetWritten + COLOR_SIZE <= buffer.length) {
        const convertedColor = conversionOp(color);
        buffer[offsetWritten] = convertedColor & 0xff;
        buffer[offsetWritten + 1] = (convertedColor >> 8) & 0xff;
      }
    }
  }
}
