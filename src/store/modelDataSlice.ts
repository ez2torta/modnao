import {
  AnyAction,
  createAsyncThunk,
  createSlice,
  PayloadAction
} from '@reduxjs/toolkit';
import { HYDRATE } from 'next-redux-wrapper';
import { NLTextureDef } from '@/types/NLAbstractions';
import { WorkerEvent } from '@/worker';
import exportTextureFile from '../utils/textures/files/exportTextureFile';
import { AppState } from './store';
import HslValues from '@/utils/textures/HslValues';
import { selectSceneTextureDefs } from './selectors';
import { SourceTextureData } from '@/utils/textures/SourceTextureData';
import WorkerThreadPool from '../utils/WorkerThreadPool';

const workerPool = new WorkerThreadPool();

export type LoadPolygonsResult = {
  type: 'loadPolygonFile';
  result: LoadPolygonsPayload;
};

export type LoadTexturesResult = {
  type: 'loadTextureFile';
  result: LoadTexturesPayload;
};

export type AdjustTextureHslResult = {
  type: 'adjustTextureHsl';
  result: AdjustTextureHslPayload;
};

export type WorkerResponses =
  | LoadPolygonsResult
  | LoadTexturesResult
  | AdjustTextureHslResult;

export type EditedTexture = {
  width: number;
  height: number;
  bufferUrls: SourceTextureData;
  dataUrls: SourceTextureData;
  hsl: HslValues;
};

export type LoadTexturesPayload = {
  textureDefs: NLTextureDef[];
  fileName: string;
  textureBufferUrl: string;
  hasCompressedTextures: boolean;
};

export type LoadPolygonsPayload = {
  models: NLModel[];
  textureDefs: NLTextureDef[];
  fileName: string;
  polygonBufferUrl: string;
};

export type AdjustTextureHslPayload = {
  textureIndex: number;
  bufferUrls: SourceTextureData;
  dataUrls: SourceTextureData;
  hsl: HslValues;
};

export interface ModelDataState {
  models: NLModel[];
  textureDefs: NLTextureDef[];
  /**
   * dictionary of texture index to previous buffer url stacks
   * note: should consider having only this stack and not deriving from
   * textureDefs to simplify state
   */
  textureBufferUrlHistory: {
    [key: number]: SourceTextureData[];
  };
  editedTextures: {
    [key: number]: EditedTexture;
  };
  polygonFileName?: string;
  textureFileName?: string;
  hasEditedTextures: boolean;
  hasCompressedTextures: boolean;
  textureBufferUrl?: string;
  polygonBufferUrl?: string;
}

const sliceName = 'modelData';

export const initialModelDataState: ModelDataState = {
  models: [],
  textureDefs: [],
  editedTextures: {},
  textureBufferUrlHistory: {},
  polygonFileName: undefined,
  textureFileName: undefined,
  hasEditedTextures: false,
  hasCompressedTextures: false
};

export const loadPolygonFile = createAsyncThunk<
  LoadPolygonsPayload,
  File,
  { state: AppState }
>(
  `${sliceName}/loadPolygonFile`,
  async (file: File, { getState }): Promise<LoadPolygonsPayload> => {
    const { modelData } = getState();
    const buffer = await file.arrayBuffer();
    const thread = workerPool.allocate();

    const result = await new Promise<LoadPolygonsPayload>((resolve) => {
      if (thread) {
        const prevPolygonBufferUrl = modelData.polygonBufferUrl;
        thread.onmessage = (event: MessageEvent<LoadPolygonsResult>) => {
          resolve(event.data.result);

          if (prevPolygonBufferUrl) {
            URL.revokeObjectURL(prevPolygonBufferUrl);
          }

          workerPool.unallocate(thread);
        };

        thread?.postMessage({
          type: 'loadPolygonFile',
          payload: { buffer }
        } as WorkerEvent);
      }
    });

    return result;
  }
);

export const loadTextureFile = createAsyncThunk<
  LoadTexturesPayload,
  File,
  { state: AppState }
>(`${sliceName}/loadTextureFile`, async (file, { getState }) => {
  const state = getState();
  const { textureDefs } = state.modelData;
  const buffer = new Uint8Array(await file.arrayBuffer());
  const prevTextureBufferUrl = state.modelData.textureBufferUrl;
  const thread = workerPool.allocate();

  const result = await new Promise<LoadTexturesPayload>((resolve) => {
    if (thread) {
      thread.onmessage = (event: MessageEvent<LoadTexturesResult>) => {
        resolve(event.data.result);

        // deallocate existing blob
        if (prevTextureBufferUrl) {
          URL.revokeObjectURL(prevTextureBufferUrl);
        }

        workerPool.unallocate(thread);
      };

      const fileName = file.name;
      thread?.postMessage({
        type: 'loadTextureFile',
        payload: {
          fileName,
          textureDefs,
          buffer
        }
      } as WorkerEvent);
    }
  });

  return result;
});

export const adjustTextureHsl = createAsyncThunk<
  AdjustTextureHslPayload,
  { textureIndex: number; hsl: HslValues },
  { state: AppState }
>(
  `${sliceName}/adjustTextureHsl`,
  async ({ textureIndex, hsl }, { getState }) => {
    const state = getState();
    const textureDef = state.modelData.textureDefs[textureIndex];
    const { width, height, bufferUrls: sourceTextureData } = textureDef;
    const thread = workerPool.allocate();

    const result = await new Promise<AdjustTextureHslPayload>((resolve) => {
      if (thread) {
        thread.onmessage = (event: MessageEvent<AdjustTextureHslResult>) => {
          resolve(event.data.result);
          workerPool.unallocate(thread);
        };

        thread?.postMessage({
          type: 'adjustTextureHsl',
          payload: {
            hsl,
            textureIndex,
            sourceTextureData,
            width,
            height
          }
        } as WorkerEvent);
      }
    });

    return result;
  }
);

export const replaceTextureImage = createAsyncThunk<
  {
    textureIndex: number;
    bufferUrls: SourceTextureData;
    dataUrls: SourceTextureData;
  },
  {
    textureIndex: number;
    bufferUrls: SourceTextureData;
    dataUrls: SourceTextureData;
  },
  { state: AppState }
>(
  `${sliceName}/replaceTextureImage`,
  async ({ textureIndex, bufferUrls, dataUrls }) => {
    /*
  @TODO: complete rewriting logic to ensure size matches
    const state = getState();

    // const textureDef = state.modelData.textureDefs[textureIndex];
    // const { width, height } = textureDef;
    if (width !== def.width || height !== def.height) {
      throw new Error(
        `size of texture must match the original (${width} x ${height})}`
      );
    }
    */

    return {
      textureIndex,
      bufferUrls,
      dataUrls
    };
  }
);

export const downloadTextureFile = createAsyncThunk<
  void,
  void,
  { state: AppState }
>(`${sliceName}/downloadTextureFile`, async (_, { getState }) => {
  const state = getState();
  const { textureFileName, hasCompressedTextures, textureBufferUrl } =
    state.modelData;
  const textureDefs = selectSceneTextureDefs(state);

  try {
    await exportTextureFile(
      textureDefs,
      textureFileName,
      hasCompressedTextures,
      textureBufferUrl as string
    );
  } catch (error) {
    window.alert(error);
    console.error(error);
  }
});

const modelDataSlice = createSlice({
  name: sliceName,
  initialState: initialModelDataState,
  reducers: {
    revertTextureImage(
      state,
      { payload: { textureIndex } }: PayloadAction<{ textureIndex: number }>
    ) {
      // only valid if there's an actual texture to revert to
      if (state.textureBufferUrlHistory[textureIndex].length === 0) {
        return state;
      }

      // remove editedTexture state in case of hsl changes
      state.editedTextures = Object.fromEntries(
        Object.entries(state.editedTextures).filter(
          ([k]) => k !== textureIndex.toString()
        )
      );

      const textureBufferUrlHistory = state.textureBufferUrlHistory[
        textureIndex
      ].pop() as SourceTextureData;

      state.textureDefs[textureIndex].bufferUrls.translucent =
        textureBufferUrlHistory.translucent;
      state.textureDefs[textureIndex].bufferUrls.opaque =
        textureBufferUrlHistory.opaque;
      return state;
    }
  },
  extraReducers: (builder) => {
    builder.addCase(
      loadPolygonFile.fulfilled,
      (
        state: ModelDataState,
        { payload: { models, textureDefs, fileName, polygonBufferUrl } }
      ) => {
        state.models = models;
        state.textureDefs = textureDefs;
        state.editedTextures = {};
        state.polygonFileName = fileName;
        state.textureFileName = undefined;
        state.polygonBufferUrl = polygonBufferUrl;
      }
    );

    builder.addCase(
      loadTextureFile.fulfilled,
      (state: ModelDataState, { payload }) => {
        const {
          textureDefs,
          fileName,
          hasCompressedTextures,
          textureBufferUrl
        } = payload;
        state.textureDefs = textureDefs;
        state.editedTextures = {};
        state.textureFileName = fileName;
        state.hasCompressedTextures = hasCompressedTextures;
        state.textureBufferUrl = textureBufferUrl;
      }
    );

    builder.addCase(
      replaceTextureImage.fulfilled,
      (
        state: ModelDataState,
        { payload: { textureIndex, bufferUrls, dataUrls } }
      ) => {
        // @TODO: for better UX, re-apply existing HSL on new image automagically
        // in thunk that led to this fulfilled action
        // clear previous edited texture when replacing a texture image
        if (state.editedTextures[textureIndex]) {
          state.editedTextures = Object.fromEntries(
            Object.entries(state.editedTextures).filter(
              ([k]) => Number(k) !== textureIndex
            )
          );
        }

        state.textureBufferUrlHistory[textureIndex] =
          state.textureBufferUrlHistory[textureIndex] || [];
        state.textureBufferUrlHistory[textureIndex].push(
          state.textureDefs[textureIndex].bufferUrls as SourceTextureData
        );

        state.textureDefs[textureIndex].bufferUrls = bufferUrls;
        state.textureDefs[textureIndex].dataUrls = dataUrls;
        state.hasEditedTextures = true;
      }
    );

    builder.addCase(
      adjustTextureHsl.fulfilled,
      (
        state: ModelDataState,
        { payload: { textureIndex, bufferUrls, dataUrls, hsl } }
      ) => {
        const { width, height } = state.textureDefs[textureIndex];
        if (hsl.h != 0 || hsl.s != 0 || hsl.l != 0) {
          state.editedTextures[textureIndex] = {
            width,
            height,
            bufferUrls,
            dataUrls,
            hsl
          };
        } else {
          const entries = Object.entries(state.editedTextures).filter(
            ([k]) => Number(k) !== textureIndex
          );

          state.editedTextures = Object.fromEntries(entries);
        }
        state.hasEditedTextures =
          state.hasEditedTextures ||
          Object.keys(state.editedTextures).length > 0;
      }
    );

    builder.addCase(HYDRATE, (state, { payload }: AnyAction) =>
      Object.assign(state, payload)
    );
  }
});

export const { revertTextureImage } = modelDataSlice.actions;

export default modelDataSlice;
