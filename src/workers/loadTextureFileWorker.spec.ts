import { sharedBufferFrom } from '@/utils/data';
import loadTextureFileWorker from './loadTextureFileWorker';
import { NLUITextureDef } from '@/types';

describe('loadTextureFileWorker', () => {
  it('uses PVR rectangular Morton addressing for type-13 textures', () => {
    const textureDefs: NLUITextureDef[] = [
      {
        address: 0,
        width: 8,
        height: 4,
        colorFormat: 'RGB565',
        colorFormatValue: 1,
        type: 13,
        baseLocation: 0,
        ramOffset: 0,
        bufferKeys: { opaque: '', translucent: '' }
      }
    ];
    const source = new Uint16Array(32);

    source[19] = 0xf800;

    const result = loadTextureFileWorker({
      fileName: 'STG0BTEX.BIN',
      textureFileBuffer: sharedBufferFrom(new Uint8Array(source.buffer)),
      textureDefs,
      oobReferenceable: false,
      isLzssCompressed: false
    });
    const pixels = new Uint8ClampedArray(result.texturePixelBuffers[0]);

    expect(pixels.slice((2 * 8 + 5) * 4, (2 * 8 + 6) * 4)).toEqual(
      new Uint8ClampedArray([255, 0, 0, 255])
    );
  });

  it('keeps loading available textures when a raw texture region is missing', () => {
    const textureDefs: NLUITextureDef[] = [
      {
        address: 0,
        width: 8,
        height: 8,
        colorFormat: 'RGB565',
        colorFormatValue: 1,
        type: 1,
        baseLocation: 0,
        ramOffset: 0,
        bufferKeys: { opaque: '', translucent: '' }
      }
    ];

    const result = loadTextureFileWorker({
      fileName: 'STG0BTEX.BIN',
      textureFileBuffer: sharedBufferFrom(new Uint8Array()),
      textureDefs,
      oobReferenceable: false,
      isLzssCompressed: false
    });

    expect(result.texturePixelBuffers).toHaveLength(2);
    expect(result.texturePixelBuffers).toEqual([
      expect.any(SharedArrayBuffer),
      expect.any(SharedArrayBuffer)
    ]);
    expect(
      result.texturePixelBuffers.map((buffer) => buffer.byteLength)
    ).toEqual([0, 0]);
  });
});
