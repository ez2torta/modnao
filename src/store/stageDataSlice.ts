import { AnyAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { HYDRATE } from 'next-redux-wrapper';
import processStagePolygonFile from './stage-data/processStagePolygonFile';
import processStageTextureFile from './stage-data/processStageTextureFile';
import { AppState } from './store';
import { NLTextureDef, TextureDataUrlType } from '@/types/NLAbstractions';
import getImageDimensions from '@/utils/images/getImageDimensions';
import exportStageTextureFile from './stage-data/exportStageTextureFile';

export interface StageDataState {
  models: NLModel[];
  textureDefs: NLTextureDef[];
  replacedTextureDataUrls: Record<number, string>;
  polygonFileName?: string;
  textureFileName?: string;
  hasReplacementTextures: boolean;
}

const sliceName = 'stageData';

export const initialStageDataState: StageDataState = {
  models: [],
  textureDefs: [],
  polygonFileName: undefined,
  textureFileName: undefined,
  hasReplacementTextures: false,
  replacedTextureDataUrls: {}
};

export const loadStagePolygonFile = createAsyncThunk<
  { models: NLModel[]; textureDefs: NLTextureDef[]; fileName?: string },
  File
>(`${sliceName}/loadStagePolygonFile`, processStagePolygonFile);

export const loadStageTextureFile = createAsyncThunk<
  { models: NLModel[]; textureDefs: NLTextureDef[]; fileName?: string },
  File,
  { state: AppState }
>(`${sliceName}/loadStageTextureFile`, (file, { getState }) => {
  const state = getState();
  const { models, textureDefs } = state.stageData;

  // if no polygon loaded, resolve entry data
  if (!state.stageData.polygonFileName) {
    return Promise.resolve({ models, textureDefs, fileName: undefined });
  }

  return processStageTextureFile(file, models, textureDefs);
});

export const replaceTextureDataUrl = createAsyncThunk<
  { textureIndex: number; dataUrl: string },
  { textureIndex: number; dataUrl: string },
  { state: AppState }
>(
  `${sliceName}/replaceTextureDataUrl`,
  async ({ textureIndex, dataUrl }, { getState }) => {
    const state = getState();
    const { textureDefs } = state.stageData;
    const def = textureDefs[textureIndex];

    const [width, height] = await getImageDimensions(dataUrl);

    if (width !== def.width || height !== def.height) {
      throw new Error(
        `size of texture must match the original (${width} x ${height})}`
      );
    }

    return { textureIndex, dataUrl };
  }
);

export const downloadStageTextureFile = createAsyncThunk<
  void,
  void,
  { state: AppState }
>(`${sliceName}/downloadStageTextureFile`, async (_, { getState }) => {
  const state = getState();
  await exportStageTextureFile(state.stageData.textureDefs);
});

const stageDataSlice = createSlice({
  name: sliceName,
  initialState: initialStageDataState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(
      loadStagePolygonFile.fulfilled,
      (
        state: StageDataState,
        { payload: { models, textureDefs, fileName } }
      ) => {
        state.models = models;
        state.textureDefs = textureDefs;
        state.polygonFileName = fileName;
        state.textureFileName = undefined;
      }
    );

    builder.addCase(
      loadStageTextureFile.fulfilled,
      (
        state: StageDataState,
        { payload: { models, textureDefs, fileName } }
      ) => {
        state.models = models;
        state.textureDefs = textureDefs;
        state.textureFileName = fileName;
      }
    );

    builder.addCase(
      replaceTextureDataUrl.fulfilled,
      (state: StageDataState, { payload: { textureIndex, dataUrl } }) => {
        const dataUrlTypes = Object.keys(
          state.textureDefs[textureIndex].dataUrls
        ) as TextureDataUrlType[];

        dataUrlTypes.forEach((key) => {
          state.textureDefs[textureIndex].dataUrls[key] = dataUrl;
        });

        state.hasReplacementTextures = true;
      }
    );

    builder.addCase(HYDRATE, (state, { payload }: AnyAction) =>
      Object.assign(state, payload)
    );
  }
});

export default stageDataSlice;
