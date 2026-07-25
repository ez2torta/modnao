import JSZip from 'jszip';
import { setupStore } from '@/store';
import type { ResourceAttribs } from '@/types';
import loadModelDataPatch from './loadModelDataPatch';
import { processPolygonFile } from './modelDataThunks';
import {
  createModelDataPatchManifest,
  default as parseModelDataPatchManifest
} from './parseModelDataPatchManifest';
import validateModelDataPatchCompatibility, {
  getModelDataPatchPrefix,
  getModelDataPatchTarget
} from './validateModelDataPatchCompatibility';

describe('modelDataPatch', () => {
  const resourceAttribs: ResourceAttribs = {
    game: 'MVC2',
    name: 'Desert Stage (Orange Sky)',
    identifier: '0x01',
    resourceType: 'mvc2-stage',
    filenamePattern: 'STG01',
    oobReferencable: false,
    textureFileType: 'mvc2-stage-preview',
    hasLzssTextureFile: false,
    polygonMapped: true
  };

  const createManifest = () =>
    createModelDataPatchManifest({
      resourcePrefix: 'stg01',
      target: getModelDataPatchTarget(resourceAttribs),
      vertexColors: [
        {
          modelIndex: 0,
          meshIndex: 1,
          polygonIndex: 2,
          vertexIndex: 3,
          color: [1, 0.5, 0, 1]
        }
      ],
      textures: [
        {
          textureIndex: 4,
          imagePath: 'stg01.mn.4.png',
          width: 64,
          height: 32
        }
      ]
    });

  it('generates and parses a versioned combined manifest', () => {
    const manifest = createManifest();

    expect(parseModelDataPatchManifest(JSON.stringify(manifest))).toEqual(
      manifest
    );
  });

  it('rejects invalid extensions, JSON, and versions', () => {
    expect(() => getModelDataPatchPrefix('stg01.zip')).toThrow('.mnp.zip');
    expect(() => parseModelDataPatchManifest('{')).toThrow('damaged');
    expect(() =>
      parseModelDataPatchManifest(
        JSON.stringify({ ...createManifest(), formatVersion: 2 })
      )
    ).toThrow('version');
  });

  it('rejects a patch for a different loaded resource', () => {
    const manifest = createManifest();

    expect(() =>
      validateModelDataPatchCompatibility(manifest, {
        ...resourceAttribs,
        name: 'Factory Stage',
        identifier: '0x02'
      })
    ).toThrow(
      'This patch is for Marvel vs Capcom 2: Desert Stage (Orange Sky), but Marvel vs Capcom 2: Factory Stage is currently open.'
    );
  });

  it('loads a compatible patch archive for the active polygon resource', async () => {
    const manifest = createManifest();
    const zip = new JSZip();
    zip.file('stg01.mnp.json', JSON.stringify(manifest));
    const zipBuffer: ArrayBuffer = await zip.generateAsync({
      type: 'arraybuffer'
    });
    const file = new File([zipBuffer], 'stg01.mnp.zip');
    const store = setupStore();

    store.dispatch({
      type: processPolygonFile.fulfilled.type,
      payload: {
        models: [],
        originalModels: [],
        textureDefs: [],
        fileName: 'STG01POL.BIN',
        polygonBufferKey: 'polygon-buffer',
        resourceAttribs
      }
    });

    const result = await store.dispatch(loadModelDataPatch(file));

    expect(loadModelDataPatch.fulfilled.match(result)).toBe(true);
    expect(result.payload).toEqual(manifest);
  });
});
