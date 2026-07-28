import { sharedBufferFrom } from '@/utils/data';
import loadTextureFileWorker from './loadTextureFileWorker';
import { NLUITextureDef } from '@/types';

describe('loadTextureFileWorker', () => {
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
