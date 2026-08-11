import fs from 'fs';
import path from 'path';
import { Jimp } from 'jimp';
import type { NLUITextureDef, TextureFileType } from '@/types';
import scanForModelPointers from '@/utils/polygons/serialize/scanForModelPointers';
import scanTextureHeaderData from '@/utils/polygons/serialize/scanTextureHeaderData';
import loadTextureFileWorker from '@/workers/loadTextureFileWorker';
import exportTextureDefRegionWorker from '@/workers/exportTextureDefRegionWorker';
import exportTextureFileWorker from '@/workers/exportTextureFileWorker';
import decompressLzssBuffer from '@/utils/data/decompressLzssBuffer';
import compressLzssBuffer from '@/utils/data/compressLzssBuffer';
import decompressVqBuffer from '@/utils/data/decompressVqBuffer';
import sharedBufferFrom from '@/utils/data/sharedBufferFrom';
import resourceAttribMappings from '@/constants/resourceAttribMappings';
import getResourceAttribs from '@/utils/resource-attribs/getResourceAttribs';
import getTextureDefDataLength from '@/utils/textures/getTextureDefDataLength';
import encodeZMortonPosition from '@/utils/textures/parse/encodeZMortonPosition';
import rgba8888TargetOps from '@/utils/color-conversions/rgba8888TargetOps';
import rgbaToArgb4444 from '@/utils/color-conversions/rgbaToArgb4444';
import rgbaToArgb1555 from '@/utils/color-conversions/rgbaToArgb1555';
import rgbaToRgb565 from '@/utils/color-conversions/rgbaToRgb565';

const PTR_SIZE = 4;

function decompressLzssSection(
  buffer: Buffer,
  start: number,
  end?: number
): [SharedArrayBuffer, Buffer] {
  const section = buffer.subarray(start, end);
  const decompressed = decompressLzssBuffer(section);
  return [decompressed, section];
}

async function loadPngRgba(pngPath: string): Promise<[Uint8Array, number, number]> {
  const img = await Jimp.read(pngPath);
  return [new Uint8Array(img.bitmap.data), img.bitmap.width, img.bitmap.height];
}

export interface DumpOptions {
  verbose?: boolean;
}

export interface InjectOptions {
  verbose?: boolean;
}

/**
 * Extrae texturas de parejas POL + TEX (Escenarios, Demos, Efectos)
 */
export async function dumpPolTexPair(
  polPath: string,
  texPath: string,
  outDir: string,
  options: DumpOptions = {}
): Promise<number> {
  if (!fs.existsSync(polPath) || !fs.existsSync(texPath)) {
    return 0;
  }

  const polBuf = fs.readFileSync(polPath);
  const sharedPol = new SharedArrayBuffer(polBuf.length);
  new Uint8Array(sharedPol).set(polBuf);

  const [modelPointers, modelRamOffset] = scanForModelPointers(sharedPol);
  const textureDefs = scanTextureHeaderData(sharedPol, modelRamOffset);

  if (textureDefs.length === 0) {
    return 0;
  }

  const texBuf = fs.readFileSync(texPath);
  const sharedTex = new SharedArrayBuffer(texBuf.length);
  new Uint8Array(sharedTex).set(texBuf);

  const loadResult = loadTextureFileWorker({
    fileName: path.basename(texPath),
    textureFileBuffer: sharedTex,
    textureDefs,
    isLzssCompressed: false,
    oobReferenceable: true
  });

  fs.mkdirSync(outDir, { recursive: true });

  let exported = 0;
  for (let i = 0; i < textureDefs.length; i++) {
    const t = textureDefs[i];
    const pixelBuf = Buffer.from(new Uint8Array(loadResult.texturePixelBuffers[2 * i + 1]));
    if (pixelBuf.length === 0) continue;

    const img = new Jimp({ width: t.width, height: t.height, data: pixelBuf });
    const pngPath = path.join(outDir, `modnao-texture-${i}.png`);
    await img.write(pngPath as any);
    exported++;
  }

  if (options.verbose) {
    console.log(`[DUMP] ${path.basename(texPath)} -> ${exported} texturas en ${outDir}`);
  }
  return exported;
}

/**
 * Reinyecta texturas PNG en un archivo TEX.BIN usando POL.BIN como referencia
 */
export async function injectPolTexPair(
  polPath: string,
  texPath: string,
  pngDir: string,
  outTexPath: string,
  options: InjectOptions = {}
): Promise<boolean> {
  if (!fs.existsSync(polPath) || !fs.existsSync(texPath) || !fs.existsSync(pngDir)) {
    return false;
  }

  const polBuf = fs.readFileSync(polPath);
  const sharedPol = new SharedArrayBuffer(polBuf.length);
  new Uint8Array(sharedPol).set(polBuf);

  const [modelPointers, modelRamOffset] = scanForModelPointers(sharedPol);
  const textureDefs = scanTextureHeaderData(sharedPol, modelRamOffset);

  const origTexBuf = fs.readFileSync(texPath);
  const rebuiltTexBuf = new SharedArrayBuffer(origTexBuf.length);
  new Uint8Array(rebuiltTexBuf).set(origTexBuf);

  let modifiedCount = 0;
  for (let i = 0; i < textureDefs.length; i++) {
    const t = textureDefs[i];
    const pngPath = path.join(pngDir, `modnao-texture-${i}.png`);
    if (!fs.existsSync(pngPath)) continue;

    const writeLocation = t.baseLocation - t.ramOffset;
    const expectedLen = getTextureDefDataLength(t);
    if (writeLocation < 0 || writeLocation + expectedLen > rebuiltTexBuf.byteLength) {
      // Textura out-of-bounds o compartida en VRAM global
      continue;
    }

    try {
      const [translucentBuffer] = await loadPngRgba(pngPath);
      const sharedColors = new SharedArrayBuffer(translucentBuffer.length);
      new Uint8Array(sharedColors).set(translucentBuffer);

      await exportTextureDefRegionWorker({
        textureDef: t,
        textureFileType: 'vs2-stage-file',
        textureBuffer: rebuiltTexBuf,
        pixelColors: sharedColors
      });
      modifiedCount++;
    } catch (e: any) {
      if (options.verbose) {
        console.warn(`[WARN] No se pudo reinyectar textura ${i} en ${path.basename(texPath)}: ${e.message}`);
      }
    }
  }

  fs.mkdirSync(path.dirname(outTexPath), { recursive: true });
  fs.writeFileSync(outTexPath, Buffer.from(new Uint8Array(rebuiltTexBuf)));

  if (options.verbose) {
    console.log(`[INJECT] ${path.basename(texPath)} -> ${path.basename(outTexPath)} (${modifiedCount} texturas actualizadas)`);
  }
  return true;
}

/**
 * Extrae retratos de personaje (PLxx_FAC.BIN)
 */
export async function dumpCharacterFac(
  facPath: string,
  outDir: string,
  options: DumpOptions = {}
): Promise<number> {
  if (!fs.existsSync(facPath)) return 0;

  const buffer = fs.readFileSync(facPath);
  const startPointer = buffer.readUInt32LE(0);
  const ogPointers: number[] = [];

  for (let offset = 0; offset < startPointer; offset += PTR_SIZE) {
    ogPointers.push(buffer.readUInt32LE(offset));
  }

  if (ogPointers.length === 0) return 0;

  const sections: Buffer[] = [];
  const [jpLifebar] = decompressLzssSection(buffer, ogPointers[0], ogPointers[1]);
  sections.push(Buffer.from(new Uint8Array(jpLifebar)));

  const [vq1Lzss] = decompressLzssSection(buffer, ogPointers[1], ogPointers[2]);
  const vq1Image = decompressVqBuffer(vq1Lzss, 256, 256);
  sections.push(Buffer.from(new Uint8Array(vq1Image)));

  const [vq2Lzss, compressedVq2Buffer] = decompressLzssSection(buffer, ogPointers[2], ogPointers?.[3]);
  const vq2Image = decompressVqBuffer(vq2Lzss, 128, 128);
  sections.push(Buffer.from(new Uint8Array(vq2Image)));

  const [usLifebar] = ogPointers.length <= 3 ? [undefined, undefined] : decompressLzssSection(buffer, ogPointers[3]);
  if (usLifebar) {
    sections.push(Buffer.from(new Uint8Array(usLifebar)));
  }

  let position = ogPointers[0];
  const pointerBuffer = Buffer.alloc(ogPointers[0]);
  for (let i = 0; i < sections.length; i++) {
    pointerBuffer.writeUInt32LE(position, PTR_SIZE * i);
    position += sections[i].length;
  }

  const trailingSection = new Uint8Array(buffer).slice(
    ogPointers[ogPointers.length - 1] + (compressedVq2Buffer).length
  );

  const finalSectionPointer =
    pointerBuffer.readUInt32LE(PTR_SIZE * (sections.length - 1)) +
    sections[sections.length - 1].length;

  const fsPointerBuffer = Buffer.alloc(4);
  fsPointerBuffer.writeUInt32LE(finalSectionPointer, 0);

  const decompressedBuffer = Buffer.concat([
    pointerBuffer,
    ...sections,
    Buffer.from(trailingSection),
    fsPointerBuffer
  ]);

  const sharedBuffer = sharedBufferFrom(decompressedBuffer);
  const textureFileType = 'mvc2-character-portraits';
  const textureDefs = (resourceAttribMappings[textureFileType].textureShapesMap ?? [])
    .slice(0, ogPointers.length)
    .map((d, i) => ({
      ...d,
      baseLocation: pointerBuffer.readUInt32LE(i * PTR_SIZE)
    }));

  const loadResult = loadTextureFileWorker({
    fileName: path.basename(facPath),
    textureFileBuffer: sharedBuffer,
    textureDefs,
    oobReferenceable: true,
    isLzssCompressed: false
  });

  fs.mkdirSync(outDir, { recursive: true });

  let exported = 0;
  for (let i = 0; i < textureDefs.length; i++) {
    const t = textureDefs[i];
    const pixelBuf = Buffer.from(new Uint8Array(loadResult.texturePixelBuffers[2 * i + 1]));
    if (pixelBuf.length === 0) continue;

    const img = new Jimp({ width: t.width, height: t.height, data: pixelBuf });
    const pngPath = path.join(outDir, `modnao-texture-${i}.png`);
    await img.write(pngPath as any);
    exported++;
  }

  if (options.verbose) {
    console.log(`[DUMP] ${path.basename(facPath)} -> ${exported} texturas en ${outDir}`);
  }
  return exported;
}

/**
 * Reinyecta retratos de personaje (PLxx_FAC.BIN)
 */
export async function injectCharacterFac(
  facPath: string,
  pngDir: string,
  outFacPath: string,
  options: InjectOptions = {}
): Promise<boolean> {
  if (!fs.existsSync(facPath) || !fs.existsSync(pngDir)) return false;

  const buffer = fs.readFileSync(facPath);
  const startPointer = buffer.readUInt32LE(0);
  const ogPointers: number[] = [];

  for (let offset = 0; offset < startPointer; offset += PTR_SIZE) {
    ogPointers.push(buffer.readUInt32LE(offset));
  }

  const sections: Buffer[] = [];
  const [jpLifebar] = decompressLzssSection(buffer, ogPointers[0], ogPointers[1]);
  sections.push(Buffer.from(new Uint8Array(jpLifebar)));

  const [vq1Lzss] = decompressLzssSection(buffer, ogPointers[1], ogPointers[2]);
  const vq1Image = decompressVqBuffer(vq1Lzss, 256, 256);
  sections.push(Buffer.from(new Uint8Array(vq1Image)));

  const [vq2Lzss, compressedVq2Buffer] = decompressLzssSection(buffer, ogPointers[2], ogPointers?.[3]);
  const vq2Image = decompressVqBuffer(vq2Lzss, 128, 128);
  sections.push(Buffer.from(new Uint8Array(vq2Image)));

  const [usLifebar] = ogPointers.length <= 3 ? [undefined, undefined] : decompressLzssSection(buffer, ogPointers[3]);
  if (usLifebar) {
    sections.push(Buffer.from(new Uint8Array(usLifebar)));
  }

  let position = ogPointers[0];
  const pointerBuffer = Buffer.alloc(ogPointers[0]);
  for (let i = 0; i < sections.length; i++) {
    pointerBuffer.writeUInt32LE(position, PTR_SIZE * i);
    position += sections[i].length;
  }

  const trailingSection = new Uint8Array(buffer).slice(
    ogPointers[ogPointers.length - 1] + (compressedVq2Buffer).length
  );

  const finalSectionPointer =
    pointerBuffer.readUInt32LE(PTR_SIZE * (sections.length - 1)) +
    sections[sections.length - 1].length;

  const fsPointerBuffer = Buffer.alloc(4);
  fsPointerBuffer.writeUInt32LE(finalSectionPointer, 0);

  const decompressedBuffer = Buffer.concat([
    pointerBuffer,
    ...sections,
    Buffer.from(trailingSection),
    fsPointerBuffer
  ]);

  const sharedBuffer = sharedBufferFrom(decompressedBuffer);
  const textureFileType = 'mvc2-character-portraits';
  const textureDefs = (resourceAttribMappings[textureFileType].textureShapesMap ?? [])
    .slice(0, ogPointers.length)
    .map((d, i) => ({
      ...d,
      baseLocation: pointerBuffer.readUInt32LE(i * PTR_SIZE)
    }));

  let modifiedCount = 0;
  for (let i = 0; i < textureDefs.length; i++) {
    const pngPath = path.join(pngDir, `modnao-texture-${i}.png`);
    if (!fs.existsSync(pngPath)) continue;

    try {
      const [translucentBuffer] = await loadPngRgba(pngPath);
      const sharedColors = new SharedArrayBuffer(translucentBuffer.length);
      new Uint8Array(sharedColors).set(translucentBuffer);

      await exportTextureDefRegionWorker({
        textureDef: textureDefs[i],
        textureFileType,
        textureBuffer: sharedBuffer,
        pixelColors: sharedColors
      });
      modifiedCount++;
    } catch (e: any) {
      if (options.verbose) {
        console.warn(`[WARN] Error reinyectando retrato ${i} en ${path.basename(facPath)}: ${e.message}`);
      }
    }
  }

  const finalBuffer = await exportTextureFileWorker({
    textureFileType,
    textureBuffer: sharedBuffer,
    isLzssCompressed: false
  });

  fs.mkdirSync(path.dirname(outFacPath), { recursive: true });
  fs.writeFileSync(outFacPath, Buffer.from(new Uint8Array(finalBuffer)));

  if (options.verbose) {
    console.log(`[INJECT] ${path.basename(facPath)} -> ${path.basename(outFacPath)} (${modifiedCount} texturas actualizadas)`);
  }
  return true;
}

/**
 * Extrae archivos genéricos basados en LZSS / Mappings (SELSTG, PLxx_WIN, SELTEX, ENDDCTEX, etc.)
 */
export async function dumpGenericTextureFile(
  binPath: string,
  outDir: string,
  options: DumpOptions = {}
): Promise<number> {
  if (!fs.existsSync(binPath)) return 0;

  const fileName = path.basename(binPath);
  const attribs = getResourceAttribs('', fileName);
  if (!attribs || !attribs.textureShapesMap || attribs.textureShapesMap.length === 0) {
    return 0;
  }

  const rawBuffer = fs.readFileSync(binPath);
  let textureBuffer: SharedArrayBuffer;

  if (attribs.hasLzssTextureFile) {
    textureBuffer = decompressLzssBuffer(rawBuffer);
  } else {
    textureBuffer = new SharedArrayBuffer(rawBuffer.length);
    new Uint8Array(textureBuffer).set(rawBuffer);
  }

  const loadResult = loadTextureFileWorker({
    fileName,
    textureFileBuffer: textureBuffer,
    textureDefs: attribs.textureShapesMap,
    oobReferenceable: attribs.oobReferencable ?? false,
    isLzssCompressed: attribs.hasLzssTextureFile
  });

  fs.mkdirSync(outDir, { recursive: true });

  let exported = 0;
  for (let i = 0; i < attribs.textureShapesMap.length; i++) {
    const t = attribs.textureShapesMap[i];
    const pixelBuf = Buffer.from(new Uint8Array(loadResult.texturePixelBuffers[2 * i + 1]));
    if (pixelBuf.length === 0) continue;

    const img = new Jimp({ width: t.width, height: t.height, data: pixelBuf });
    const pngPath = path.join(outDir, `modnao-texture-${i}.png`);
    await img.write(pngPath as any);
    exported++;
  }

  if (options.verbose) {
    console.log(`[DUMP] ${fileName} -> ${exported} texturas en ${outDir}`);
  }
  return exported;
}

/**
 * Reinyecta archivos genéricos (SELSTG, PLxx_WIN, SELTEX, ENDDCTEX, etc.)
 */
export async function injectGenericTextureFile(
  binPath: string,
  pngDir: string,
  outBinPath: string,
  options: InjectOptions = {}
): Promise<boolean> {
  if (!fs.existsSync(binPath) || !fs.existsSync(pngDir)) return false;

  const fileName = path.basename(binPath);
  const attribs = getResourceAttribs('', fileName);
  if (!attribs || !attribs.textureShapesMap || attribs.textureShapesMap.length === 0) {
    return false;
  }

  const rawBuffer = fs.readFileSync(binPath);
  let textureBuffer: SharedArrayBuffer;

  if (attribs.hasLzssTextureFile) {
    textureBuffer = decompressLzssBuffer(rawBuffer);
  } else {
    textureBuffer = new SharedArrayBuffer(rawBuffer.length);
    new Uint8Array(textureBuffer).set(rawBuffer);
  }

  const textureFileType = (attribs.textureFileType || 'mvc2-menu') as TextureFileType;

  let modified = 0;
  for (let i = 0; i < attribs.textureShapesMap.length; i++) {
    const pngPath = path.join(pngDir, `modnao-texture-${i}.png`);
    if (!fs.existsSync(pngPath)) continue;

    try {
      const [translucentBuffer] = await loadPngRgba(pngPath);
      const sharedColors = new SharedArrayBuffer(translucentBuffer.length);
      new Uint8Array(sharedColors).set(translucentBuffer);

      await exportTextureDefRegionWorker({
        textureDef: attribs.textureShapesMap[i],
        textureFileType,
        textureBuffer,
        pixelColors: sharedColors
      });
      modified++;
    } catch (e: any) {
      if (options.verbose) {
        console.warn(`[WARN] Error reinyectando textura ${i} en ${fileName}: ${e.message}`);
      }
    }
  }

  const finalBuffer = await exportTextureFileWorker({
    textureFileType,
    textureBuffer,
    isLzssCompressed: attribs.hasLzssTextureFile ?? false
  });

  fs.mkdirSync(path.dirname(outBinPath), { recursive: true });
  fs.writeFileSync(outBinPath, Buffer.from(new Uint8Array(finalBuffer)));

  if (options.verbose) {
    console.log(`[INJECT] ${fileName} -> ${path.basename(outBinPath)} (${modified} texturas actualizadas)`);
  }
  return true;
}

/**
 * Extrae los 56 personajes de la intro arcade en DM08CHR.BIN
 */
export async function dumpDm08Chr(
  chrPath: string,
  outDir: string,
  options: DumpOptions = {}
): Promise<number> {
  if (!fs.existsSync(chrPath)) return 0;

  const chrBuf = fs.readFileSync(chrPath);
  const startOffset = chrBuf.readUInt32LE(0);
  const count = startOffset / 4;

  fs.mkdirSync(outDir, { recursive: true });

  const width = 256;
  const height = 256;
  let exported = 0;

  for (let i = 0; i < count; i++) {
    const start = chrBuf.readUInt32LE(i * 4);
    const end = i < count - 1 ? chrBuf.readUInt32LE((i + 1) * 4) : chrBuf.length;
    const section = chrBuf.subarray(start, end);
    const decomp = decompressLzssBuffer(section);
    const sourceBuffer = Buffer.from(new Uint8Array(decomp));

    const pixels = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) {
      const yOffset = width * y;
      const sourceY = height - 1 - y;
      for (let x = 0; x < width; x++) {
        const offsetDrawn = encodeZMortonPosition(x, sourceY);
        const readOffset = offsetDrawn * 2;
        if (readOffset + 2 <= sourceBuffer.length) {
          const colorValue = sourceBuffer.readUInt16LE(readOffset);
          const color = rgba8888TargetOps.ARGB4444(colorValue);
          const canvasOffset = (yOffset + x) * 4;
          pixels[canvasOffset] = color.r;
          pixels[canvasOffset + 1] = color.g;
          pixels[canvasOffset + 2] = color.b;
          pixels[canvasOffset + 3] = color.a;
        }
      }
    }

    const img = new Jimp({ width, height, data: pixels });
    const pngPath = path.join(outDir, `modnao-texture-${i}.png`);
    await img.write(pngPath as any);
    exported++;
  }

  if (options.verbose) {
    console.log(`[DUMP] ${path.basename(chrPath)} -> ${exported} personajes en ${outDir}`);
  }
  return exported;
}

/**
 * Reinyecta los 56 personajes modificados en DM08CHR.BIN
 */
export async function injectDm08Chr(
  chrPath: string,
  pngDir: string,
  outChrPath: string,
  options: InjectOptions = {}
): Promise<boolean> {
  if (!fs.existsSync(chrPath) || !fs.existsSync(pngDir)) return false;

  const chrBuf = fs.readFileSync(chrPath);
  const startOffset = chrBuf.readUInt32LE(0);
  const count = startOffset / 4;

  const width = 256;
  const height = 256;
  const compressedSections: Buffer[] = [];
  let modifiedCount = 0;

  for (let i = 0; i < count; i++) {
    const pngPath = path.join(pngDir, `modnao-texture-${i}.png`);
    if (fs.existsSync(pngPath)) {
      const [pixels] = await loadPngRgba(pngPath);
      const raw16Buf = Buffer.alloc(width * height * 2);

      for (let y = 0; y < height; y++) {
        const yOffset = width * y;
        const sourceY = height - 1 - y;
        for (let x = 0; x < width; x++) {
          const offsetDrawn = encodeZMortonPosition(x, sourceY);
          const canvasOffset = (yOffset + x) * 4;
          const r = pixels[canvasOffset];
          const g = pixels[canvasOffset + 1];
          const b = pixels[canvasOffset + 2];
          const a = pixels[canvasOffset + 3];
          const color16 = rgbaToArgb4444({ r, g, b, a });
          raw16Buf.writeUInt16LE(color16, offsetDrawn * 2);
        }
      }

      const compressed = compressLzssBuffer(raw16Buf);
      compressedSections.push(Buffer.from(new Uint8Array(compressed)));
      modifiedCount++;
    } else {
      const start = chrBuf.readUInt32LE(i * 4);
      const end = i < count - 1 ? chrBuf.readUInt32LE((i + 1) * 4) : chrBuf.length;
      compressedSections.push(chrBuf.subarray(start, end));
    }
  }

  const pointerTableSize = count * 4;
  const pointerTableAligned = (pointerTableSize + 31) & ~31;
  const pointerBuf = Buffer.alloc(pointerTableAligned, 0);
  let currentOffset = pointerTableAligned;

  const paddedSections: Buffer[] = [];
  for (let i = 0; i < count; i++) {
    pointerBuf.writeUInt32LE(currentOffset, i * 4);
    const sec = compressedSections[i];
    const rem = sec.length % 32;
    const padLen = rem === 0 ? 0 : 32 - rem;
    const paddedSec = padLen === 0 ? sec : Buffer.concat([sec, Buffer.alloc(padLen, 0)]);
    paddedSections.push(paddedSec);
    currentOffset += paddedSec.length;
  }

  const finalBuf = Buffer.concat([pointerBuf, ...paddedSections]);
  fs.mkdirSync(path.dirname(outChrPath), { recursive: true });
  fs.writeFileSync(outChrPath, finalBuf);

  if (options.verbose) {
    console.log(`[INJECT] ${path.basename(chrPath)} -> ${path.basename(outChrPath)} (${modifiedCount} personajes actualizados)`);
  }
  return true;
}

/**
 * Extrae las texturas de Cable y Ruby Heart de la intro en DM08CAB.BIN (2 texturas 512x512 ARGB1555)
 */
export async function dumpDm08Cab(
  cabPath: string,
  outDir: string,
  options: DumpOptions = {}
): Promise<number> {
  if (!fs.existsSync(cabPath)) return 0;

  const cabBuf = fs.readFileSync(cabPath);
  const width = 512;
  const height = 512;
  const textureByteSize = width * height * 2; // 524288 bytes per texture

  fs.mkdirSync(outDir, { recursive: true });

  const textureCount = Math.floor(cabBuf.length / textureByteSize);
  let exported = 0;

  for (let i = 0; i < textureCount; i++) {
    const baseOffset = i * textureByteSize;
    const pixels = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y++) {
      const yOffset = width * y;
      const sourceY = height - 1 - y;
      for (let x = 0; x < width; x++) {
        const offsetDrawn = encodeZMortonPosition(x, sourceY);
        const readOffset = baseOffset + offsetDrawn * 2;
        if (readOffset + 2 <= cabBuf.length) {
          const colorValue = cabBuf.readUInt16LE(readOffset);
          const color = rgba8888TargetOps.ARGB1555(colorValue);
          const canvasOffset = (yOffset + x) * 4;
          pixels[canvasOffset] = color.r;
          pixels[canvasOffset + 1] = color.g;
          pixels[canvasOffset + 2] = color.b;
          pixels[canvasOffset + 3] = color.a;
        }
      }
    }

    const img = new Jimp({ width, height, data: pixels });
    const pngPath = path.join(outDir, `modnao-texture-${i}.png`);
    await img.write(pngPath as any);
    exported++;
  }

  if (options.verbose) {
    console.log(`[DUMP] ${path.basename(cabPath)} -> ${exported} texturas (Cable y Ruby Heart) en ${outDir}`);
  }
  return exported;
}

/**
 * Reinyecta las texturas de Cable y Ruby Heart en DM08CAB.BIN
 */
export async function injectDm08Cab(
  cabPath: string,
  pngDir: string,
  outCabPath: string,
  options: InjectOptions = {}
): Promise<boolean> {
  const origCabBuf = fs.existsSync(cabPath) ? fs.readFileSync(cabPath) : Buffer.alloc(1048576);
  const width = 512;
  const height = 512;
  const textureByteSize = width * height * 2;
  const textureCount = 2;

  const finalBuf = Buffer.from(origCabBuf);
  let modifiedCount = 0;

  for (let i = 0; i < textureCount; i++) {
    const pngPath = path.join(pngDir, `modnao-texture-${i}.png`);
    if (!fs.existsSync(pngPath)) continue;

    const [pixels] = await loadPngRgba(pngPath);
    const baseOffset = i * textureByteSize;

    for (let y = 0; y < height; y++) {
      const yOffset = width * y;
      const sourceY = height - 1 - y;
      for (let x = 0; x < width; x++) {
        const offsetDrawn = encodeZMortonPosition(x, sourceY);
        const canvasOffset = (yOffset + x) * 4;
        const r = pixels[canvasOffset];
        const g = pixels[canvasOffset + 1];
        const b = pixels[canvasOffset + 2];
        const a = pixels[canvasOffset + 3];
        const color16 = rgbaToArgb1555({ r, g, b, a });
        finalBuf.writeUInt16LE(color16, baseOffset + offsetDrawn * 2);
      }
    }
    modifiedCount++;
  }

  fs.mkdirSync(path.dirname(outCabPath), { recursive: true });
  fs.writeFileSync(outCabPath, finalBuf);

  if (options.verbose) {
    console.log(`[INJECT] DM08CAB.BIN -> ${path.basename(outCabPath)} (${modifiedCount} texturas actualizadas)`);
  }
  return true;
}

