import { TextureColorFormat } from '../TextureColorFormat';
import processExportTexturePixels from './processExportTexturePixels';

describe('processExportTexturePixels', () => {
  it('correctly processes RGB565 pixel colors', () => {
    const pixelColors = new Uint8Array([
      0xff, 0x00, 0x32, 0x04, 0x08, 0xff, 0x00, 0xff
    ]);

    const width = 2;
    const height = 2;
    const baseLocation = 0;
    const ramOffset = 0;
    const colorFormat: TextureColorFormat = 'RGB565';
    const textureBuffer = new SharedArrayBuffer(8);

    processExportTexturePixels({
      pixelColors,
      width,
      height,
      baseLocation,
      ramOffset,
      colorFormat,
      textureBuffer
    });

    const uint8Array = new Uint8Array(textureBuffer);
    expect(uint8Array).toEqual(new Uint8Array([0, 0, 6, 248, 0, 0, 224, 15]));
  });

  it('writes rectangular twiddled pixels without leaving empty regions', () => {
    const pixelColors = new Uint8Array([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255, 255,
      255, 0, 255, 0, 255, 255, 255, 255, 0, 255, 255, 128, 128, 128, 255
    ]);
    const textureBuffer = new SharedArrayBuffer(16);

    processExportTexturePixels({
      pixelColors,
      width: 4,
      height: 2,
      baseLocation: 0,
      ramOffset: 0,
      colorFormat: 'RGB565',
      textureBuffer,
      isRectangleTwiddledTexture: true
    });

    expect(new Uint8Array(textureBuffer)).toEqual(
      new Uint8Array([
        224, 255, 0, 248, 255, 7, 224, 7, 31, 248, 31, 0, 16, 132, 255, 255
      ])
    );
  });
});
