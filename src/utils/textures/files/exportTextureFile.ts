import { NLTextureDef } from '@/types/NLAbstractions';
import nonSerializables from '../../../store/nonSerializables';
import decodeZMortonPosition from '@/utils/textures/serialize/decodeZMortonPosition';
import rgbaToRgb565 from '@/utils/color-conversions/rgbaToRgb565';
import rgbaToArgb1555 from '@/utils/color-conversions/rgbaToArgb1555';
import rgbaToArgb4444 from '@/utils/color-conversions/rgbaToArgb4444';
import { RgbaColor, TextureColorFormat } from '@/utils/textures';
import loadImageFromDataUrl from '@/utils/images/loadImageFromDataUrl';
import { compressTextureBuffer } from '@/utils/textures/parse';
import { objectUrlToBuffer } from '@/utils/data';

/**
 * gets rotated pixels from a provided dataUrl string
 */
async function getPixelsFromDataUrlImage(dataUrl: string) {
  const image = await loadImageFromDataUrl(dataUrl);
  const canvas = document.createElement('canvas');
  const width = image.width;
  const height = image.height;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(image, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return imageData.data;
}

const COLOR_SIZE = 2;

const conversionDict: Record<TextureColorFormat, (color: RgbaColor) => number> =
  {
    RGB565: rgbaToRgb565,
    ARGB1555: rgbaToArgb1555,
    ARGB4444: rgbaToArgb4444,
    RGB555: () => 0,
    ARGB8888: () => 0
  };

export default async function exportTextureFile(
  textureDefs: NLTextureDef[],
  textureFileName = '',
  hasCompressedTextures: boolean,
  textureBufferUrl: string
): Promise<void> {
  const textureBuffer = Buffer.from(await objectUrlToBuffer(textureBufferUrl));
  if (!textureBuffer) {
    return;
  }

  let i = 0;
  for await (const t of textureDefs) {
    const { baseLocation, ramOffset, width, height } = t;

    const pixelColors = await getPixelsFromDataUrlImage(t.dataUrls.translucent);

    for (let y = 0; y < height; y++) {
      const yOffset = width * y;
      for (let offset = yOffset; offset < yOffset + width; offset++) {
        const [positionX, positionY] = decodeZMortonPosition(offset);
        const positionOffset = positionY * width + positionX;
        const colorOffset = positionOffset * 4;
        const color = {
          r: pixelColors[colorOffset],
          g: pixelColors[colorOffset + 1],
          b: pixelColors[colorOffset + 2],
          a: pixelColors[colorOffset + 3]
        };

        // workaround in interrim of black colors in scenario where rgb
        // that get lost on premultiplied alpha: preserve the source texture
        // rgb colors when alpha is zero
        if (color.a === 0) {
          const o = nonSerializables.sourceTextureData[i].translucent.data;
          color.r = o[colorOffset];
          color.g = o[colorOffset + 1];
          color.b = o[colorOffset + 2];
        }

        const conversionOp = conversionDict[t.colorFormat];
        const offsetWritten = baseLocation - ramOffset + offset * COLOR_SIZE;

        // note: it is possible for textures to point out of bounds
        // of the file since it targets RAM in-game; hence the check
        if (offsetWritten + COLOR_SIZE < textureBuffer.length) {
          textureBuffer.writeUInt16LE(conversionOp(color), offsetWritten);
        }
      }
    }
    i++;
  }

  const outputBuffer = !hasCompressedTextures
    ? textureBuffer
    : compressTextureBuffer(textureBuffer);

  const output = new Blob([outputBuffer], {
    type: 'application/octet-stream'
  });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(output);

  const name = textureFileName.substring(0, textureFileName.lastIndexOf('.'));

  const extension = textureFileName.substring(
    textureFileName.lastIndexOf('.') + 1
  );
  link.download = `${name}.modnao.${extension}`;
  link.click();
}
