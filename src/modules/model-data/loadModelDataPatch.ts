import JSZip from 'jszip';
import { createElement } from 'react';
import O from '@/constants/StructOffsets';
import { showError } from '@/modules/error-messages';
import { createAppAsyncThunk } from '@/storeTypings';
import globalBuffers from '@/utils/data/globalBuffers';
import { writeVertexColorToBuffer } from './modelDataThunks';
import type { LoadModelDataPatchResult } from './modelDataTypes';
import parseModelDataPatchManifest from './parseModelDataPatchManifest';
import validateModelDataPatchCompatibility, {
  getModelDataPatchPrefix,
  ModelDataPatchCompatibilityError
} from './validateModelDataPatchCompatibility';

const PATCH_MODEL_CHANGES_ERROR =
  'Some model changes in this patch could not be applied. Reopen the matching POL.BIN file or get a fresh copy of the patch and try again.';

const loadModelDataPatch = createAppAsyncThunk(
  'modelData/loadModelDataPatch',
  async (
    file: File,
    { dispatch, getState }
  ): Promise<LoadModelDataPatchResult | undefined> => {
    const { polygonFileName, resourceAttribs } = getState().modelData;

    if (!polygonFileName || !resourceAttribs) {
      dispatch(
        showError({
          title: 'Patch could not be imported',
          message:
            'Open the POL.BIN model you want to update before importing a patch.'
        })
      );
      return;
    }

    try {
      const resourcePrefix = getModelDataPatchPrefix(file.name);
      let zip: JSZip;

      try {
        zip = await JSZip.loadAsync(file);
      } catch {
        throw new Error(
          'This patch file could not be opened. It may be incomplete or damaged.'
        );
      }

      const manifestFile = zip.file(`${resourcePrefix}.mnp.json`);

      if (!manifestFile) {
        throw new Error(
          'This patch file is incomplete or damaged. Create or download it again and retry.'
        );
      }

      const manifest = parseModelDataPatchManifest(
        await manifestFile.async('string')
      );

      if (manifest.resourcePrefix !== resourcePrefix) {
        throw new Error(
          'This patch filename has changed. Restore its original filename and retry.'
        );
      }

      const {
        models,
        polygonBufferKey,
        polygonFileName: currentPolygonFileName,
        resourceAttribs: currentResourceAttribs
      } = getState().modelData;

      if (
        !currentPolygonFileName ||
        !currentResourceAttribs ||
        !polygonBufferKey
      ) {
        throw new Error(
          'The open model changed while the patch was loading. Open the model and import the patch again.'
        );
      }

      validateModelDataPatchCompatibility(manifest, currentResourceAttribs);

      const polygonBuffer = globalBuffers.get(polygonBufferKey);
      const vertexColorUpdatesByModel = new Map<
        number,
        Map<number, NLColorRGBA>
      >();

      manifest.vertexColors.forEach(
        ({ modelIndex, meshIndex, polygonIndex, vertexIndex, color }) => {
          const mesh = models[modelIndex]?.meshes[meshIndex];
          const vertex = mesh?.polygons[polygonIndex]?.vertices[vertexIndex];

          if (!mesh?.hasColoredVertices || !vertex?.colors) {
            throw new Error(PATCH_MODEL_CHANGES_ERROR);
          }

          if (
            !Array.isArray(color) ||
            color.length !== 4 ||
            !color.every(
              (channel) =>
                Number.isFinite(channel) && channel >= 0 && channel <= 1
            )
          ) {
            throw new Error(PATCH_MODEL_CHANGES_ERROR);
          }

          const colorOffset = vertex.contentAddress + O.Vertex.COLORS;

          if (colorOffset < 0 || colorOffset + 3 >= polygonBuffer.length) {
            throw new Error(PATCH_MODEL_CHANGES_ERROR);
          }

          const modelUpdates =
            vertexColorUpdatesByModel.get(modelIndex) ??
            new Map<number, NLColorRGBA>();
          modelUpdates.set(vertex.contentAddress, color);
          vertexColorUpdatesByModel.set(modelIndex, modelUpdates);
        }
      );

      vertexColorUpdatesByModel.forEach((modelUpdates) => {
        modelUpdates.forEach((color, contentAddress) => {
          writeVertexColorToBuffer(polygonBuffer, contentAddress, color);
        });
      });

      return {
        vertexColorUpdates: Array.from(
          vertexColorUpdatesByModel.entries(),
          ([modelIndex, modelUpdates]) => ({
            modelIndex,
            vertexColorUpdates: Array.from(
              modelUpdates.entries(),
              ([contentAddress, color]) => ({ contentAddress, color })
            )
          })
        )
      };
    } catch (error) {
      dispatch(
        showError({
          title: 'Patch could not be imported',
          message:
            error instanceof ModelDataPatchCompatibilityError
              ? createElement(
                  'span',
                  null,
                  'This patch is for ',
                  createElement('b', null, error.patchResource),
                  ', but ',
                  createElement('b', null, error.loadedResource),
                  ' is currently open. Open the matching model and retry.'
                )
              : error instanceof Error
                ? error.message
                : 'This patch could not be read. Create or download it again and retry.'
        })
      );
    }
  }
);

export default loadModelDataPatch;
