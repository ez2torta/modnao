import saveAs from 'file-saver';
import JSZip from 'jszip';
import { showError } from '@/modules/error-messages';
import { createAppAsyncThunk } from '@/storeTypings';
import globalBuffers from '@/utils/data/globalBuffers';
import { createB64ImgFromTextureDef } from '@/utils/textures';
import { createModelDataPatchManifest } from './parseModelDataPatchManifest';
import {
  getModelDataPatchTarget,
  normalizeModelDataResourcePrefix
} from './validateModelDataPatchCompatibility';

const downloadModelDataPatch = createAppAsyncThunk(
  'modelData/downloadModelDataPatch',
  async (
    {
      textureIndexes,
      onlyChangedVertexColors
    }: {
      textureIndexes: number[];
      onlyChangedVertexColors: boolean;
    },
    { dispatch, getState }
  ) => {
    const {
      models,
      originalModels,
      polygonFileName,
      resourceAttribs,
      textureDefs,
      textureFileName
    } = getState().modelData;
    const sourceFileName = polygonFileName ?? textureFileName;

    if (!resourceAttribs || !sourceFileName) {
      dispatch(
        showError({
          title: 'Error exporting patch',
          message: 'No supported resource is loaded.'
        })
      );
      return;
    }

    try {
      const resourcePrefix = normalizeModelDataResourcePrefix(sourceFileName);
      const textureImagePrefix =
        textureFileName?.replace(/\.([a-zA-Z0-9]+)$/, '') ?? resourcePrefix;
      const textureIndexSet = new Set(textureIndexes);
      const vertexColors = models.flatMap((model, modelIndex) =>
        model.meshes.flatMap((mesh, meshIndex) =>
          !mesh.hasColoredVertices
            ? []
            : mesh.polygons.flatMap((polygon, polygonIndex) =>
                polygon.vertices.flatMap((vertex, vertexIndex) => {
                  const originalColor =
                    originalModels[modelIndex]?.meshes[meshIndex]?.polygons[
                      polygonIndex
                    ]?.vertices[vertexIndex]?.colors;
                  const isUnchanged =
                    originalColor &&
                    vertex.colors?.every(
                      (channel, channelIndex) =>
                        Math.round(channel * 0xff) ===
                        Math.round(originalColor[channelIndex] * 0xff)
                    );

                  return !vertex.colors ||
                    (onlyChangedVertexColors && isUnchanged)
                    ? []
                    : [
                        {
                          modelIndex,
                          meshIndex,
                          polygonIndex,
                          vertexIndex,
                          color: vertex.colors
                        }
                      ];
                })
              )
        )
      );
      const textures = textureDefs.flatMap(
        ({ bufferKeys, width, height }, textureIndex) => {
          const translucentBufferKey = bufferKeys?.translucent;

          if (
            !textureIndexSet.has(textureIndex) ||
            !translucentBufferKey ||
            globalBuffers.get(translucentBufferKey).length !==
              width * height * 4
          ) {
            return [];
          }

          return [
            {
              textureIndex,
              imagePath: `${textureImagePrefix}.mn.${textureIndex}.png`,
              width,
              height
            }
          ];
        }
      );
      const manifest = createModelDataPatchManifest({
        resourcePrefix,
        target: getModelDataPatchTarget(resourceAttribs),
        vertexColors,
        textures
      });
      const zip = new JSZip();

      await Promise.all(
        textures.map(async ({ textureIndex, imagePath }) => {
          const image = await createB64ImgFromTextureDef({
            textureDef: textureDefs[textureIndex],
            asTranslucent: true
          });

          zip.file(
            imagePath,
            image.replace(/^data:image\/(png|jpeg);base64,/, ''),
            { base64: true }
          );
        })
      );

      zip.file(`${resourcePrefix}.mnp.json`, JSON.stringify(manifest, null, 2));

      saveAs(
        await zip.generateAsync({ type: 'blob' }),
        `${resourcePrefix}.mnp.zip`
      );
    } catch (error) {
      console.error(error);
      dispatch(
        showError({
          title: 'Error exporting patch',
          message:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred while exporting the patch.'
        })
      );
    }
  }
);

export default downloadModelDataPatch;
