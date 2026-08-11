const WORD_SIZE = 2;
const COMPRESSION_FLAG = 0b1000_0000_0000_0000;
const W16_MAX_LOOKBACK = 2047;

type LzssOp =
  | { type: 'raw'; word: number }
  | { type: 'match'; back: number; length: number }
  | { type: 'esc' };

/**
 * Compresses raw decompressed buffer into Capcom MvC2 LZSS format.
 *
 * Capcom LZSS Specification:
 * - 16-bit word tokens
 * - Lookback window: up to 2047 words
 * - Bitmask word per 16 chunks: bit=0 -> raw 16-bit word, bit=1 -> compressed token
 * - 16-bit token (length 2..31): (length << 11) | wordsBackCount (upper 5 bits non-zero)
 * - 32-bit token (length >= 32): Word 1 = wordsBackCount (upper 5 bits are 0), Word 2 = length
 * - Escape code: bit=1, word = 0x0000
 */
export default function compressLzssBuffer(bufferPassed: Uint8Array | Buffer): Uint8Array {
  const buffer = Buffer.isBuffer(bufferPassed) ? bufferPassed : Buffer.from(bufferPassed);
  const wordCount = buffer.length / WORD_SIZE;
  const words: number[] = new Array(wordCount);

  for (let idx = 0; idx < wordCount; idx++) {
    words[idx] = buffer.readUInt16LE(idx * WORD_SIZE);
  }

  const values: LzssOp[] = [];
  const bitmasks: number[] = [];
  let bitmask = 0;
  let chunk = 0;

  // Map each 16-bit word to its recent indices
  const posMap: Map<number, number[]> = new Map();

  let i = 0;
  while (i < wordCount) {
    const w = words[i];
    let bestLen = 0;
    let bestPos = -1;

    let positions = posMap.get(w);
    if (positions) {
      // Retain only positions within sliding window [i - W16_MAX_LOOKBACK, i)
      const minPos = i - W16_MAX_LOOKBACK;
      let startIdx = 0;
      while (startIdx < positions.length && positions[startIdx] < minPos) {
        startIdx++;
      }
      if (startIdx > 0) {
        positions = positions.slice(startIdx);
        posMap.set(w, positions);
      }

      for (let pIdx = 0; pIdx < positions.length; pIdx++) {
        const p = positions[pIdx];
        const back = i - p;
        let matchLen = 0;

        // Support overlapping / RLE repeats
        while (
          i + matchLen < wordCount &&
          matchLen < 65535 &&
          words[p + (matchLen % back)] === words[i + matchLen]
        ) {
          matchLen++;
        }

        if (matchLen > bestLen) {
          bestLen = matchLen;
          bestPos = p;
        }
      }
    }

    if (bestLen >= 2) {
      bitmask |= COMPRESSION_FLAG >> chunk;
      const back = i - bestPos;
      values.push({ type: 'match', back, length: bestLen });

      // Index words within the match
      for (let k = 0; k < bestLen; k++) {
        const pw = words[i + k];
        let pList = posMap.get(pw);
        if (!pList) {
          pList = [];
          posMap.set(pw, pList);
        }
        pList.push(i + k);
      }

      i += bestLen;
    } else {
      values.push({ type: 'raw', word: w });
      let pList = posMap.get(w);
      if (!pList) {
        pList = [];
        posMap.set(w, pList);
      }
      pList.push(i);
      i += 1;
    }

    chunk++;
    if (chunk === 16) {
      bitmasks.push(bitmask);
      bitmask = 0;
      chunk = 0;
    }
  }

  // Terminate with Capcom escape sequence in the current chunk
  bitmask |= COMPRESSION_FLAG >> chunk;
  values.push({ type: 'esc' });
  bitmasks.push(bitmask);

  const outWords: number[] = [];
  let valIdx = 0;

  for (const bm of bitmasks) {
    outWords.push(bm);
    for (let c = 0; c < 16; c++) {
      if (valIdx >= values.length) break;
      const op = values[valIdx++];
      if (op.type === 'raw') {
        outWords.push(op.word);
      } else if (op.type === 'esc') {
        outWords.push(0x0000);
      } else {
        const { back, length } = op;
        if (length < 32) {
          outWords.push((length << 11) | back);
        } else {
          outWords.push(back);
          outWords.push(length);
        }
      }
    }
  }

  const outputBuffer = Buffer.alloc(outWords.length * 2);
  for (let wIdx = 0; wIdx < outWords.length; wIdx++) {
    outputBuffer.writeUInt16LE(outWords[wIdx], wIdx * 2);
  }

  return new Uint8Array(outputBuffer);
}
