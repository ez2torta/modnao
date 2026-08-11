import getMipmapOffset from './getMipmapOffset';

describe('getMipmapOffset', () => {
  it('should return 0 for 1x1 textures', () => {
    expect(getMipmapOffset(1, 1, false)).toBe(0);
    expect(getMipmapOffset(1, 1, true)).toBe(0);
  });

  it('should calculate correct 16-bit mipmap byte offset for 128x128 textures (Type 2)', () => {
    // 1x1 (2B) + 2x2 (8B) + 4x4 (32B) + 8x8 (128B) + 16x16 (512B) + 32x32 (2048B) + 64x64 (8192B)
    // = 10922 bytes = 0x2AAA
    expect(getMipmapOffset(128, 128, false)).toBe(10922);
  });

  it('should calculate correct 16-bit mipmap byte offset for 256x256 textures (Type 2)', () => {
    // 10922 + 128x128 (32768B) = 43690 bytes = 0xAAAA
    expect(getMipmapOffset(256, 256, false)).toBe(43690);
  });

  it('should calculate correct VQ mipmap byte offset for 256x256 textures (Type 4)', () => {
    // 1 + ((16384 - 1) / 3) = 5462 bytes
    expect(getMipmapOffset(256, 256, true)).toBe(5462);
  });
});
