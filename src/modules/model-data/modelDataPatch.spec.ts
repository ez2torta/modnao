import type { ResourceAttribs } from '@/types';
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
    name: 'Stage 01',
    identifier: 'stg01',
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
          imagePath: 'stg01/textures/4.png',
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
    expect(() => parseModelDataPatchManifest('{')).toThrow('valid JSON');
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
        identifier: 'stg02'
      })
    ).toThrow('stg01');
  });
});
