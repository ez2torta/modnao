#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import {
  dumpPolTexPair,
  injectPolTexPair,
  dumpCharacterFac,
  injectCharacterFac,
  dumpGenericTextureFile,
  injectGenericTextureFile,
  dumpDm08Chr,
  injectDm08Chr,
  dumpDm08Cab,
  injectDm08Cab
} from './mvc2TextureManager';

const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../../..');
const DEFAULT_MVC2_DIR = path.resolve(REPO_ROOT, 'MVC2');
const DEFAULT_TEXTURES_DUMP_DIR = path.resolve(REPO_ROOT, 'Extracted_Textures');

function findFile(dir: string, filename: string): string | null {
  const direct = path.join(dir, filename);
  if (fs.existsSync(direct)) return direct;
  try {
    const list = fs.readdirSync(dir);
    const target = filename.toLowerCase();
    const found = list.find((f) => f.toLowerCase() === target);
    if (found) return path.join(dir, found);
  } catch {}
  return null;
}

async function dumpAll(mvc2Dir: string, outBaseDir: string) {
  console.log(`=======================================================`);
  console.log(`  MVC2 Texture Extractor (DUMP ALL)`);
  console.log(`  Origen : ${mvc2Dir}`);
  console.log(`  Destino: ${outBaseDir}`);
  console.log(`=======================================================\n`);

  if (!fs.existsSync(mvc2Dir)) {
    console.error(`Error: No existe el directorio ${mvc2Dir}`);
    process.exit(1);
  }

  fs.mkdirSync(outBaseDir, { recursive: true });
  const files = fs.readdirSync(mvc2Dir);

  let totalFiles = 0;
  let totalTextures = 0;

  // 1. Escenarios (STGxxPOL.BIN + STGxxTEX.BIN)
  console.log(`[*] 1/4 Procesando Escenarios (STG*)...`);
  const stagesDir = path.join(outBaseDir, 'Stages');
  for (const file of files) {
    if (/^STG[0-9A-Z]{2}TEX\.BIN$/i.test(file)) {
      const polFile = file.replace(/TEX\.BIN$/i, 'POL.BIN');
      const polPath = findFile(mvc2Dir, polFile);
      const texPath = path.join(mvc2Dir, file);
      const stageOut = path.join(stagesDir, file.replace(/\.BIN$/i, ''));

      if (polPath && fs.existsSync(polPath)) {
        const count = await dumpPolTexPair(polPath, texPath, stageOut, { verbose: true });
        if (count > 0) {
          totalFiles++;
          totalTextures += count;
        }
      }
    }
  }

  // 2. Demos y Efectos (DMxxPOL.BIN + DMxxTEX.BIN, EFKYPOL.BIN + EFKYTEX.BIN)
  console.log(`\n[*] 2/4 Procesando Demos y Efectos (DM*, EFKY)...`);
  const demosDir = path.join(outBaseDir, 'Demos');
  for (const file of files) {
    if (/^(DM[0-9A-Z]{2}|EFKY)TEX\.BIN$/i.test(file)) {
      const polFile = file.replace(/TEX\.BIN$/i, 'POL.BIN');
      const polPath = findFile(mvc2Dir, polFile);
      const texPath = path.join(mvc2Dir, file);
      const demoOut = path.join(demosDir, file.replace(/\.BIN$/i, ''));

      if (polPath && fs.existsSync(polPath)) {
        const count = await dumpPolTexPair(polPath, texPath, demoOut, { verbose: true });
        if (count > 0) {
          totalFiles++;
          totalTextures += count;
        }
      }
    }
  }

  // 2b. Personajes de la Intro Arcade (DM08CHR.BIN y DM08CAB.BIN)
  const dm08ChrPath = findFile(mvc2Dir, 'DM08CHR.BIN');
  if (dm08ChrPath && fs.existsSync(dm08ChrPath)) {
    const chrOut = path.join(demosDir, 'DM08CHR');
    const count = await dumpDm08Chr(dm08ChrPath, chrOut, { verbose: true });
    if (count > 0) {
      totalFiles++;
      totalTextures += count;
    }
  }
  const dm08CabPath = findFile(mvc2Dir, 'DM08CAB.BIN');
  if (dm08CabPath && fs.existsSync(dm08CabPath)) {
    const cabOut = path.join(demosDir, 'DM08CAB');
    const count = await dumpDm08Cab(dm08CabPath, cabOut, { verbose: true });
    if (count > 0) {
      totalFiles++;
      totalTextures += count;
    }
  }

  // 3. Retratos de Personajes (PLxx_FAC.BIN y PLxx_WIN.BIN)
  console.log(`\n[*] 3/4 Procesando Retratos de Personajes (PLxx_FAC, PLxx_WIN)...`);
  const portraitsDir = path.join(outBaseDir, 'Characters');
  for (const file of files) {
    // FAC
    if (/^PL[0-9A-Z]{2}_FAC\.BIN$/i.test(file)) {
      const facPath = path.join(mvc2Dir, file);
      const facOut = path.join(portraitsDir, file.replace(/\.BIN$/i, ''));
      const count = await dumpCharacterFac(facPath, facOut, { verbose: true });
      if (count > 0) {
        totalFiles++;
        totalTextures += count;
      }
    }
    // WIN
    if (/^PL[0-9A-Z]{2}_WIN\.BIN$/i.test(file)) {
      const winPath = path.join(mvc2Dir, file);
      const winOut = path.join(portraitsDir, file.replace(/\.BIN$/i, ''));
      const count = await dumpGenericTextureFile(winPath, winOut, { verbose: true });
      if (count > 0) {
        totalFiles++;
        totalTextures += count;
      }
    }
  }

  // 4. Menús y Selección (SELSTG, SELTEX, SELVMJ, ENDDCTEX, ENDNMTEX)
  console.log(`\n[*] 4/4 Procesando Menús e Interfaces...`);
  const menusDir = path.join(outBaseDir, 'Menus');
  const menuFiles = ['SELSTG.BIN', 'SELTEX.BIN', 'SELVMJ.BIN', 'SELVMU.BIN', 'ENDDCTEX.BIN', 'ENDNMTEX.BIN'];
  for (const file of menuFiles) {
    const binPath = findFile(mvc2Dir, file);
    if (binPath && fs.existsSync(binPath)) {
      const menuOut = path.join(menusDir, file.replace(/\.BIN$/i, ''));
      const count = await dumpGenericTextureFile(binPath, menuOut, { verbose: true });
      if (count > 0) {
        totalFiles++;
        totalTextures += count;
      }
    }
  }

  console.log(`\n=======================================================`);
  console.log(`[✓] ¡Extracción masiva completada!`);
  console.log(`    Archivos procesados: ${totalFiles}`);
  console.log(`    Texturas PNG generadas: ${totalTextures}`);
  console.log(`    Carpeta de salida: ${outBaseDir}`);
  console.log(`=======================================================`);
}

async function injectAll(inputBaseDir: string, mvc2Dir: string, outMvc2Dir: string) {
  console.log(`=======================================================`);
  console.log(`  MVC2 Texture Injector (REPACK ALL)`);
  console.log(`  Carpeta de PNGs: ${inputBaseDir}`);
  console.log(`  Plantilla Base : ${mvc2Dir}`);
  console.log(`  Destino BINs   : ${outMvc2Dir}`);
  console.log(`=======================================================\n`);

  if (!fs.existsSync(inputBaseDir)) {
    console.error(`Error: No existe el directorio de texturas ${inputBaseDir}`);
    process.exit(1);
  }

  fs.mkdirSync(outMvc2Dir, { recursive: true });

  // 1. Escenarios
  const stagesDir = path.join(inputBaseDir, 'Stages');
  if (fs.existsSync(stagesDir)) {
    for (const folder of fs.readdirSync(stagesDir)) {
      const texName = `${folder}.BIN`;
      const polName = texName.replace(/TEX\.BIN$/i, 'POL.BIN');
      const polPath = findFile(mvc2Dir, polName);
      const origTexPath = findFile(mvc2Dir, texName);
      const pngFolder = path.join(stagesDir, folder);
      const destTexPath = path.join(outMvc2Dir, texName);

      if (polPath && origTexPath && fs.existsSync(polPath) && fs.existsSync(origTexPath)) {
        await injectPolTexPair(polPath, origTexPath, pngFolder, destTexPath, { verbose: true });
      }
    }
  }

  // 2. Demos y Efectos
  const demosDir = path.join(inputBaseDir, 'Demos');
  if (fs.existsSync(demosDir)) {
    for (const folder of fs.readdirSync(demosDir)) {
      const texName = `${folder}.BIN`;
      const polName = texName.replace(/TEX\.BIN$/i, 'POL.BIN');
      const polPath = findFile(mvc2Dir, polName);
      const origTexPath = findFile(mvc2Dir, texName);
      const pngFolder = path.join(demosDir, folder);
      const destTexPath = path.join(outMvc2Dir, texName);

      if (folder === 'DM08CHR') {
        const chrPath = findFile(mvc2Dir, 'DM08CHR.BIN') || path.join(mvc2Dir, 'DM08CHR.BIN');
        const destChrPath = path.join(outMvc2Dir, 'DM08CHR.BIN');
        await injectDm08Chr(chrPath, pngFolder, destChrPath, { verbose: true });
      } else if (folder === 'DM08CAB') {
        const cabPath = findFile(mvc2Dir, 'DM08CAB.BIN') || path.join(mvc2Dir, 'DM08CAB.BIN');
        const destCabPath = path.join(outMvc2Dir, 'DM08CAB.BIN');
        await injectDm08Cab(cabPath, pngFolder, destCabPath, { verbose: true });
      } else if (polPath && origTexPath && fs.existsSync(polPath) && fs.existsSync(origTexPath)) {
        await injectPolTexPair(polPath, origTexPath, pngFolder, destTexPath, { verbose: true });
      }
    }
  }

  // 3. Retratos de Personajes
  const portraitsDir = path.join(inputBaseDir, 'Characters');
  if (fs.existsSync(portraitsDir)) {
    for (const folder of fs.readdirSync(portraitsDir)) {
      const fileName = `${folder}.BIN`;
      const origPath = findFile(mvc2Dir, fileName);
      const pngFolder = path.join(portraitsDir, folder);
      const destPath = path.join(outMvc2Dir, fileName);

      if (origPath && fs.existsSync(origPath)) {
        if (/^PL[0-9A-Z]{2}_FAC$/i.test(folder)) {
          await injectCharacterFac(origPath, pngFolder, destPath, { verbose: true });
        } else if (/^PL[0-9A-Z]{2}_WIN$/i.test(folder)) {
          await injectGenericTextureFile(origPath, pngFolder, destPath, { verbose: true });
        }
      }
    }
  }

  // 4. Menús e Interfaces
  const menusDir = path.join(inputBaseDir, 'Menus');
  if (fs.existsSync(menusDir)) {
    for (const folder of fs.readdirSync(menusDir)) {
      const fileName = `${folder}.BIN`;
      const origPath = findFile(mvc2Dir, fileName);
      const pngFolder = path.join(menusDir, folder);
      const destPath = path.join(outMvc2Dir, fileName);

      if (origPath && fs.existsSync(origPath)) {
        await injectGenericTextureFile(origPath, pngFolder, destPath, { verbose: true });
      }
    }
  }

  console.log(`\n=======================================================`);
  console.log(`[✓] ¡Inyección completada!`);
  console.log(`    Archivos .BIN guardados en: ${outMvc2Dir}`);
  console.log(`=======================================================`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  switch (command) {
    case 'dump':
    case 'export': {
      const mvc2Dir = args[1] ? path.resolve(process.cwd(), args[1]) : DEFAULT_MVC2_DIR;
      const outDir = args[2] ? path.resolve(process.cwd(), args[2]) : DEFAULT_TEXTURES_DUMP_DIR;
      await dumpAll(mvc2Dir, outDir);
      break;
    }
    case 'inject':
    case 'import': {
      const pngDir = args[1] ? path.resolve(process.cwd(), args[1]) : DEFAULT_TEXTURES_DUMP_DIR;
      const mvc2Dir = args[2] ? path.resolve(process.cwd(), args[2]) : DEFAULT_MVC2_DIR;
      const outMvc2Dir = args[3] ? path.resolve(process.cwd(), args[3]) : DEFAULT_MVC2_DIR;
      await injectAll(pngDir, mvc2Dir, outMvc2Dir);
      break;
    }
    case 'dump-file': {
      const file = args[1];
      const outDir = args[2];
      const polFile = args[3];
      if (!file || !outDir) {
        console.error('Uso: dump-file <archivo_bin> <carpeta_salida_png> [archivo_pol]');
        process.exit(1);
      }
      if (polFile) {
        await dumpPolTexPair(polFile, file, outDir, { verbose: true });
      } else if (file.includes('_FAC')) {
        await dumpCharacterFac(file, outDir, { verbose: true });
      } else if (file.includes('DM08CHR')) {
        await dumpDm08Chr(file, outDir, { verbose: true });
      } else if (file.includes('DM08CAB')) {
        await dumpDm08Cab(file, outDir, { verbose: true });
      } else {
        await dumpGenericTextureFile(file, outDir, { verbose: true });
      }
      break;
    }
    case 'inject-file': {
      const file = args[1];
      const pngDir = args[2];
      const outFile = args[3] || file;
      const polFile = args[4];
      if (!file || !pngDir) {
        console.error('Uso: inject-file <archivo_bin_orig> <carpeta_png> <archivo_bin_salida> [archivo_pol]');
        process.exit(1);
      }
      if (polFile) {
        await injectPolTexPair(polFile, file, pngDir, outFile, { verbose: true });
      } else if (file.includes('_FAC')) {
        await injectCharacterFac(file, pngDir, outFile, { verbose: true });
      } else if (file.includes('DM08CHR')) {
        await injectDm08Chr(file, pngDir, outFile, { verbose: true });
      } else if (file.includes('DM08CAB')) {
        await injectDm08Cab(file, pngDir, outFile, { verbose: true });
      } else {
        await injectGenericTextureFile(file, pngDir, outFile, { verbose: true });
      }
      break;
    }
    default:
      console.log(`
Uso de la herramienta CLI de Texturas ModNao para MVC2:

  npx tsx src/cli/index.ts dump [mvc2_dir] [output_dir]
    Extrae TODAS las texturas del juego a carpetas con imágenes PNG.

  npx tsx src/cli/index.ts inject [textures_dir] [mvc2_template_dir] [output_mvc2_dir]
    Reinyecta las imágenes PNG modificadas a los archivos .BIN de MVC2.

  npx tsx src/cli/index.ts dump-file <bin_file> <output_dir> [pol_file]
    Extrae las texturas de un único archivo .BIN a una carpeta.

  npx tsx src/cli/index.ts inject-file <bin_orig> <png_dir> <bin_salida> [pol_file]
    Reinyecta las imágenes PNG de una carpeta en un archivo .BIN.
`);
      break;
  }
}

main().catch((err) => {
  console.error('[!] Error en la ejecución:', err);
  process.exit(1);
});
