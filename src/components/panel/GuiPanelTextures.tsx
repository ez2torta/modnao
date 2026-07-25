import {
  JSX,
  MouseEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo
} from 'react';
import {
  downloadModelDataPatch,
  downloadTextureFile
} from '@/modules/model-data';
import { showDialog } from '@/modules/dialogs';
import {
  selectCanExportTextures,
  selectContentViewMode,
  selectHasLoadedTextureFile,
  selectLoadTexturesState,
  selectMeshSelectionType,
  selectModel,
  selectModels,
  selectResourceAttribs,
  selectSelectedObjectIds,
  selectSelectedTexture,
  selectTextureFileName,
  selectUpdatedTextureDefs
} from '@/selectors';
import { useAppDispatch, useAppSelector } from '@/storeTypings';
import GuiPanelButton from './GuiPanelButton';
import GuiPanelTexture from './textures/GuiPanelTexture';
import {
  Box,
  Chip,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material';
import { mdiSquare, mdiSquareOpacity } from '@mdi/js';
import GuiPanelSection from './GuiPanelSection';
import GuiPanelActionButtonRow from './GuiPanelActionButtonRow';
import MdiSvgIcon from '../MdiSvgIcon';
import SceneOptionsContext, {
  TextureViewMode
} from '@/contexts/SceneOptionsContext';

export default function GuiPanelViewOptions() {
  const { textureViewMode, setTextureViewMode } =
    useContext(SceneOptionsContext);
  const dispatch = useAppDispatch();
  const model = useAppSelector(selectModel);
  const canExportTextures = useAppSelector(selectCanExportTextures);
  const textureDefs = useAppSelector(selectUpdatedTextureDefs);
  const textureFileName = useAppSelector(selectTextureFileName);
  const selectedTexture = useAppSelector(selectSelectedTexture);
  const selectedObjectIds = useAppSelector(selectSelectedObjectIds);
  const meshSelectionType = useAppSelector(selectMeshSelectionType);
  const contentViewMode = useAppSelector(selectContentViewMode);
  const loadTexturesState = useAppSelector(selectLoadTexturesState);
  const hasLoadedTextureFile = useAppSelector(selectHasLoadedTextureFile);
  const models = useAppSelector(selectModels);
  const resourceAttribs = useAppSelector(selectResourceAttribs);

  const selectedTextureReferences = useMemo(() => {
    const references = new Map<
      number,
      { meshIndex: number; polygonIndexes?: number[] }[]
    >();

    for (const objectKey in selectedObjectIds) {
      if (!selectedObjectIds[objectKey]) {
        continue;
      }

      const [meshIndexPart, polygonIndexPart] = objectKey.split('_');
      const meshIndex = Number(meshIndexPart);
      const polygonIndex = Number(polygonIndexPart);
      const mesh = model?.meshes[meshIndex];

      if (!mesh) {
        continue;
      }

      const textureRefs = references.get(mesh.textureIndex) ?? [];
      let textureRef = textureRefs.find((ref) => ref.meshIndex === meshIndex);

      if (!textureRef) {
        textureRef = {
          meshIndex,
          polygonIndexes: meshSelectionType === 'mesh' ? undefined : []
        };
        textureRefs.push(textureRef);
        references.set(mesh.textureIndex, textureRefs);
      }

      if (
        textureRef.polygonIndexes &&
        Number.isFinite(polygonIndex) &&
        !textureRef.polygonIndexes.includes(polygonIndex)
      ) {
        textureRef.polygonIndexes.push(polygonIndex);
      }
    }

    return references;
  }, [meshSelectionType, model, selectedObjectIds]);

  // when selecting a texture, scroll to the item
  useEffect(() => {
    const textureEl = document.getElementById(`gui-panel-t-${selectedTexture}`);

    if (textureEl) {
      textureEl.scrollIntoView({ behavior: 'smooth' });
    }
  }, [textureDefs && selectedTexture]);

  const onExportTextureFile = useCallback(() => {
    dispatch(downloadTextureFile());
  }, [dispatch]);

  const onDownloadPatch = useCallback(() => {
    if (hasLoadedTextureFile) {
      dispatch(showDialog('model-data-patch-export'));
      return;
    }

    dispatch(
      downloadModelDataPatch({
        textureIndexes: [],
        onlyChangedVertexColors: false
      })
    );
  }, [dispatch, hasLoadedTextureFile]);

  const onSetTextureViewMode = useCallback(
    (_: MouseEvent<HTMLElement>, mode: TextureViewMode | null) => {
      if (!mode) {
        return;
      }

      setTextureViewMode(mode);
    },
    [setTextureViewMode]
  );

  const [textures, offsceneTextures] = useMemo(() => {
    if (loadTexturesState === 'pending') {
      return [
        Array(10)
          .fill(0)
          .map((_, i) => (
            <GuiPanelTexture
              key={i}
              textureDef={undefined}
              textureIndex={undefined}
              selectedTextureReferences={undefined}
              selected={undefined}
              contentViewMode={undefined}
            />
          )),
        []
      ];
    }
    const pTextures: JSX.Element[] = [];
    const opTextures: JSX.Element[] = [];
    const textureSet = new Set<number>();
    /** set of textureIndexes that are offscene */
    [...(model?.meshes || [])]
      .sort((m1, m2) => (m1.textureIndex || 0) - (m2.textureIndex || 0))
      .forEach((m, i) => {
        const textureDef = textureDefs?.[m.textureIndex];
        if (!textureDef) {
          return;
        }
        if (!textureSet.has(m.textureIndex)) {
          textureSet.add(m.textureIndex);
          const textureDef = textureDefs?.[m.textureIndex];

          pTextures.push(
            <GuiPanelTexture
              key={`${m.textureIndex}_${i}`}
              textureDef={textureDef}
              textureIndex={m.textureIndex}
              selectedTextureReferences={
                selectedTextureReferences.get(m.textureIndex) ?? []
              }
              selected={selectedTextureReferences.has(m.textureIndex)}
              contentViewMode={contentViewMode}
            />
          );
        }
      });

    for (let i = 0; i < textureDefs.length; i++) {
      const textureDef = textureDefs?.[i];
      if (!textureDef) {
        continue;
      }

      if (!textureSet.has(i)) {
        opTextures.push(
          <GuiPanelTexture
            key={i}
            textureDef={textureDef}
            textureIndex={i}
            selectedTextureReferences={selectedTextureReferences.get(i) ?? []}
            selected={selectedTextureReferences.has(i)}
            contentViewMode={contentViewMode}
          />
        );
      }
    }

    return [pTextures, opTextures];
  }, [
    model,
    textureDefs,
    selectedTextureReferences,
    contentViewMode,
    loadTexturesState
  ]);

  return (
    <GuiPanelSection
      title={`Textures ${
        hasLoadedTextureFile ? ` (${textureDefs.length})` : ''
      }`}
      subtitle={textureFileName}
      subtitleLoadingState={loadTexturesState}
      headerActions={
        <ToggleButtonGroup
          exclusive
          orientation='horizontal'
          size='small'
          value={textureViewMode}
          onChange={onSetTextureViewMode}
          aria-label='Texture view mode'
        >
          <Tooltip title='View and download RGBA with alpha'>
            <ToggleButton value='transparent' aria-label='Transparent images'>
              <MdiSvgIcon path={mdiSquareOpacity} fontSize='small' />
            </ToggleButton>
          </Tooltip>
          <Tooltip
            title={
              <Box>
                <Typography variant='body2'>
                  View and download opaque RGB.
                </Typography>
                <Typography variant='caption'>
                  There may be colors hidden under zero alpha.
                </Typography>
              </Box>
            }
          >
            <ToggleButton value='opaque' aria-label='Opaque images'>
              <MdiSvgIcon path={mdiSquare} fontSize='small' />
            </ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
      }
    >
      <Box
        className='textures'
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'flex-start',
          alignItems: 'flex-start',
          gap: 0.5,
          mb: 0.5,
          width: 'calc(100% + (var(--mui-spacing) * 4))',
          mx: -2,
          pl: 2,
          flexGrow: 2,
          overflowY: 'auto',
          '& .MuiDivider-root': { my: 2, width: '100%' }
        }}
      >
        {textures}
        {!offsceneTextures.length ? undefined : (
          <>
            {!models.length ? undefined : (
              <Divider flexItem>
                <Chip label='Offscene' size='small' color='secondary' />
              </Divider>
            )}
            {offsceneTextures}
          </>
        )}
      </Box>
      <GuiPanelActionButtonRow>
        {!canExportTextures ? undefined : (
          <GuiPanelButton
            tooltip='Download texture ROM binary with replaced images'
            onClick={onExportTextureFile}
            color='primary'
          >
            Export Textures
          </GuiPanelButton>
        )}
        <GuiPanelButton
          tooltip='Download textures and vertex color edits as a ModNao patch into a zip file'
          onClick={onDownloadPatch}
          color='secondary'
          disabled={!resourceAttribs}
        >
          Download Patch
        </GuiPanelButton>
      </GuiPanelActionButtonRow>
    </GuiPanelSection>
  );
}
