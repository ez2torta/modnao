export default function encodeZMortonRectanglePosition(
  x: number,
  y: number,
  width: number,
  height: number
) {
  const sharedBitCount = Math.min(Math.log2(width), Math.log2(height));
  let position = 0;

  for (let bit = 0; bit < sharedBitCount; bit += 1) {
    position |= ((y >>> bit) & 1) << (bit * 2);
    position |= ((x >>> bit) & 1) << (bit * 2 + 1);
  }

  if (width > height) {
    position |= (x >>> sharedBitCount) << (sharedBitCount * 2);
  } else if (height > width) {
    position |= (y >>> sharedBitCount) << (sharedBitCount * 2);
  }

  return position;
}
