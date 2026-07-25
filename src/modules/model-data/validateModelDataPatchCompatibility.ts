import type { ResourceAttribs } from '@/types';
import type {
  ModelDataPatchManifest,
  ModelDataPatchTarget
} from './modelDataTypes';

export const MODEL_DATA_PATCH_EXTENSION = '.mnp.zip';

export const getModelDataPatchPrefix = (fileName: string) => {
  if (!fileName.toLowerCase().endsWith(MODEL_DATA_PATCH_EXTENSION)) {
    throw new Error('Patch archives must use the .mnp.zip extension.');
  }

  const prefix = fileName.slice(0, -MODEL_DATA_PATCH_EXTENSION.length);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(prefix)) {
    throw new Error('Patch archive has an invalid resource prefix.');
  }

  return prefix;
};

export const normalizeModelDataResourcePrefix = (fileName: string) => {
  const sourceName = fileName
    .replace(/(?:POL|TEX)?\.BIN$/i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  if (!sourceName) {
    throw new Error('The loaded resource does not have a valid file name.');
  }

  return sourceName;
};

export const getModelDataPatchTarget = ({
  game,
  resourceType,
  identifier,
  polygonMapped,
  textureFileType,
  textureShapesMap
}: ResourceAttribs): ModelDataPatchTarget => ({
  game,
  resourceType,
  identifier,
  polygonMapped,
  textureMapped: Boolean(textureFileType || textureShapesMap?.length)
});

export default function validateModelDataPatchCompatibility(
  { target }: ModelDataPatchManifest,
  resourceAttribs: ResourceAttribs
) {
  const loadedTarget = getModelDataPatchTarget(resourceAttribs);

  if (
    target.game !== loadedTarget.game ||
    target.resourceType !== loadedTarget.resourceType ||
    target.identifier !== loadedTarget.identifier ||
    target.polygonMapped !== loadedTarget.polygonMapped ||
    target.textureMapped !== loadedTarget.textureMapped
  ) {
    throw new Error(
      `Patch targets ${target.game} ${target.identifier}, but ${loadedTarget.game} ${loadedTarget.identifier} is loaded.`
    );
  }
}