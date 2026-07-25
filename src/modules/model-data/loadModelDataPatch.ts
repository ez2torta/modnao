import JSZip from 'jszip';
import { createElement } from 'react';
import { showError } from '@/modules/error-messages';
import { createAppAsyncThunk } from '@/storeTypings';
import parseModelDataPatchManifest from './parseModelDataPatchManifest';
import validateModelDataPatchCompatibility, {
  getModelDataPatchPrefix,
  ModelDataPatchCompatibilityError
} from './validateModelDataPatchCompatibility';

const loadModelDataPatch = createAppAsyncThunk(
  'modelData/loadModelDataPatch',
  async (file: File, { dispatch, getState }) => {
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

      validateModelDataPatchCompatibility(manifest, resourceAttribs);

      return manifest;
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
