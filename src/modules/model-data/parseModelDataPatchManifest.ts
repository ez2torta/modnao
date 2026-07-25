import type { ModelDataPatchManifest } from './modelDataTypes';

export const MODEL_DATA_PATCH_FORMAT_VERSION = 1;

export const createModelDataPatchManifest = ({
  resourcePrefix,
  target,
  vertexColors,
  textures
}: Omit<
  ModelDataPatchManifest,
  'formatVersion' | 'content'
>): ModelDataPatchManifest => ({
  formatVersion: MODEL_DATA_PATCH_FORMAT_VERSION,
  resourcePrefix,
  target,
  content: {
    vertexColors: vertexColors.length > 0,
    textures: textures.length > 0
  },
  vertexColors,
  textures
});

export default function parseModelDataPatchManifest(
  json: string
): ModelDataPatchManifest {
  let manifest: ModelDataPatchManifest;

  try {
    manifest = JSON.parse(json);
  } catch {
    throw new Error('Patch manifest is not valid JSON.');
  }

  if (manifest.formatVersion !== MODEL_DATA_PATCH_FORMAT_VERSION) {
    throw new Error('Patch format version is not supported.');
  }

  return manifest;
}
