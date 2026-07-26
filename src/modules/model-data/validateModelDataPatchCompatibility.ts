import gameNameMap from '@/constants/gameNameMap';
import resourceAttribMappings from '@/constants/resourceAttribMappings';
import resourceTypeNameMap from '@/constants/resourceTypeNameMap';
import type { ResourceAttribs } from '@/types';
import type {
  ModelDataPatchManifest,
  ModelDataPatchTarget
} from './modelDataTypes';

export const MODEL_DATA_PATCH_EXTENSION = '.mnp.zip';

export class ModelDataPatchCompatibilityError extends Error {
  constructor(
    readonly patchResource: string,
    readonly loadedResource: string
  ) {
    super(
      `This patch is for ${patchResource}, but ${loadedResource} is currently open. Open the matching model and retry.`
    );
  }
}

export const getModelDataPatchPrefix = (fileName: string) => {
  if (!fileName.toLowerCase().endsWith(MODEL_DATA_PATCH_EXTENSION)) {
    throw new Error('Choose a ModNao patch file ending in .mnp.zip.');
  }

  const prefix = fileName.slice(0, -MODEL_DATA_PATCH_EXTENSION.length);

  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(prefix)) {
    throw new Error(
      'This patch filename is not recognized. Restore its original filename and retry.'
    );
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
    const patchResourceAttribs = Object.values(resourceAttribMappings).find(
      ({ game, resourceType, identifier }) =>
        game === target.game &&
        resourceType === target.resourceType &&
        identifier === target.identifier
    );
    const patchResource = `${gameNameMap[target.game]}: ${
      patchResourceAttribs?.name ??
      `${resourceTypeNameMap[target.resourceType]} (${target.identifier})`
    }`;
    const loadedResource = `${gameNameMap[resourceAttribs.game]}: ${resourceAttribs.name}`;

    throw new ModelDataPatchCompatibilityError(patchResource, loadedResource);
  }
}
