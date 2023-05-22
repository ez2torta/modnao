import {
  selectModel,
  selectModelCount,
  selectModelIndex,
  selectObjectIndex,
  selectObjectSelectionType,
  selectTextureDefs,
  setObjectType,
  useAppDispatch,
  useAppSelector
} from '@/store';
import {
  Button,
  Checkbox,
  Divider,
  Drawer,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  styled
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2
import {
  useMemo,
  useEffect,
  useCallback,
  useContext,
  SyntheticEvent
} from 'react';
import ViewOptionsContext, {
  MeshDisplayMode
} from '@/contexts/ViewOptionsContext';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';

import useStageFilePicker from '@/hooks/useStageFilePicker';
import { useModelSelectionExport } from '@/hooks';
import PanelTexture from './PanelTexture';

// @TODO: consider either:
// (1) breaking this panel into separate components,
// (2) offload hook functionality since there's quite a lot of cruft
// (3) abstract the components to eliminate cognitive overhead

const StyledDrawer = styled(Drawer)(
  ({ theme }) => `
    & > .MuiPaper-root:before {
      position: relative;
      content: '""',
      width: '222px',
      height: '100%'
    }

    & > .MuiPaper-root.MuiDrawer-paper.MuiDrawer-paperAnchorRight {
        position: absolute;
        width: 222px;
        top: 0;
        right: 0;
        display: flex;
        flex-direction: column; 
        align-items: flex-end;
        max-height: 100vh;
        box-sizing: border-box;
        padding-top: ${theme.spacing(1)};
        padding-bottom: ${theme.spacing(2)};
    }

    & > .MuiPaper-root .MuiToggleButtonGroup-root:not(:first-item) {
      margin-top: ${theme.spacing(1)};
    }

    & > .MuiPaper-root .MuiToggleButtonGroup-root {
      margin-bottom: ${theme.spacing(1)};
    }

    & > .MuiPaper-root .MuiToggleButtonGroup-root .MuiButtonBase-root {
      width: 100%;
    }

    & > .MuiPaper-root > .MuiTypography-subtitle2, & > .MuiPaper-root > :not(.MuiDivider-root):not(.textures) {
      width: 100%;
      padding-left: ${theme.spacing(2)};
      padding-right: ${theme.spacing(2)};
    }

    & > .MuiPaper-root > .selection {
      display: flex;
      flex-direction: column;
      align-items: end;
      width: 100%;    
    }

    & *:nth-child(odd) {
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }

    & .property-table > *:nth-child(even) {
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }

    & .textures {
      width: 222px;
      flex-grow: 2;
      overflow-y: auto;
    }

    & > .MuiPaper-root > .MuiDivider-root {
      margin-bottom: ${theme.spacing(1)};
    }

    & > .textures *:not(:last-child) {
      margin-bottom: ${theme.spacing(1)}
    }

    & .view-options {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }

    & .buttons {
      display: flex;
      width: 100%;
    }

    & .buttons > :not(:last-child) {
      margin-right: ${theme.spacing(2)}
    }
  `
);

export default function GuiPanel() {
  // @TODO use a more standard error dialog vs using window.alert here
  const openFileSelector = useStageFilePicker(globalThis.alert);
  const onExportSelection = useModelSelectionExport();
  const viewOptions = useContext(ViewOptionsContext);
  const dispatch = useAppDispatch();
  const modelIndex = useAppSelector(selectModelIndex);
  const modelCount = useAppSelector(selectModelCount);
  const objectIndex = useAppSelector(selectObjectIndex);
  const objectSelectionType = useAppSelector(selectObjectSelectionType);
  const model = useAppSelector(selectModel);
  const textureDefs = useAppSelector(selectTextureDefs);

  const selectedMeshTexture: number = useMemo(() => {
    const textureIndex = model?.meshes?.[objectIndex]?.textureIndex;

    return typeof textureIndex === 'number' ? textureIndex : -1;
  }, [model, objectIndex]);

  const onSetObjectSelectionType = useCallback(
    (_: React.MouseEvent<HTMLElement>, type: any) => {
      type && dispatch(setObjectType(type));
    },
    []
  );

  const onSetMeshDisplayMode = useCallback(
    (_: React.MouseEvent<HTMLElement>, mode: any) => {
      mode && viewOptions.setMeshDisplayMode(mode as MeshDisplayMode);
    },
    [viewOptions.setMeshDisplayMode]
  );

  const onSetShowAxesHelper = useCallback(
    (_: SyntheticEvent<Element, Event>, value: boolean) => {
      viewOptions.setShowAxesHelper(value);
    },
    [viewOptions.setShowAxesHelper]
  );

  const onSetShowPolygonAddresses = useCallback(
    (_: SyntheticEvent<Element, Event>, value: boolean) => {
      viewOptions.setShowPolygonAddresses(value);
    },
    [viewOptions.setShowPolygonAddresses]
  );

  const onSetShowSceneCursor = useCallback(
    (_: SyntheticEvent<Element, Event>, value: boolean) => {
      viewOptions.setShowSceneCursor(value);
    },
    [viewOptions.setShowSceneCursor]
  );

  const textures = useMemo(() => {
    const images: JSX.Element[] = [];
    const textureSet = new Set<number>();

    (model?.meshes || []).forEach((m, i) => {
      if (!textureSet.has(m.textureIndex) && textureDefs?.[m.textureIndex]) {
        textureSet.add(m.textureIndex);
        const textureDef = textureDefs?.[m.textureIndex];

        images.push(
          <PanelTexture
            key={`${m.textureIndex}_${i}`}
            textureDef={textureDef}
            textureIndex={m.textureIndex}
            textureSize={m.textureSize}
            isDeemphasized={
              !(
                selectedMeshTexture === -1 ||
                selectedMeshTexture === m.textureIndex
              )
            }
          />
        );
      }
    });

    return images;
  }, [model, textureDefs, selectedMeshTexture]);

  // when selecting a texture, scroll to the item
  useEffect(() => {
    const textureEl = document.getElementById(
      `debug-panel-t-${selectedMeshTexture}`
    );

    if (textureEl) {
      textureEl.scrollIntoView({ behavior: 'smooth' });
    }
  }, [textureDefs && selectedMeshTexture]);

  return (
    <StyledDrawer variant='permanent' anchor='right'>
      <Divider flexItem>
        <Typography variant='subtitle2' textAlign='left' width='100%'>
          Selection
        </Typography>
      </Divider>
      <div className='selection'>
        <Grid container className={'property-table'}>
          <Grid xs={8}>
            <Typography variant='body1' textAlign='right'>
              Model Count
            </Typography>
          </Grid>
          <Grid xs={4}>
            <Typography variant='button' textAlign='right'>
              {modelCount}
            </Typography>
          </Grid>
          <Grid xs={8}>
            <Typography variant='body1' textAlign='right'>
              Model Index
            </Typography>
          </Grid>
          <Grid xs={4}>
            <Typography variant='button' textAlign='right'>
              {modelIndex === -1 ? 'N/A' : modelIndex}
            </Typography>
          </Grid>
          <Grid xs={8}>
            <Typography variant='body1' textAlign='right'>
              Object Index
            </Typography>
          </Grid>
          <Grid xs={4}>
            <Typography variant='button' textAlign='right'>
              {objectIndex === -1 ? 'N/A' : objectIndex}
            </Typography>
          </Grid>
          <Grid xs={5}>
            <Typography variant='body1' textAlign='right'>
              Selection Type
            </Typography>
          </Grid>
          <Grid xs={6}>
            <ToggleButtonGroup
              orientation='vertical'
              color='secondary'
              value={objectSelectionType}
              size='small'
              exclusive
              onChange={onSetObjectSelectionType}
              aria-label='text alignment'
              disabled
            >
              <ToggleButton value='mesh'>mesh</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </div>
      <Divider flexItem>
        <Typography variant='subtitle2' textAlign='left' width='100%'>
          View Options
        </Typography>
      </Divider>
      <div className='view-options'>
        <Grid container className={'property-table'}>
          <Grid xs={6}>
            <Typography variant='body1' textAlign='right'>
              Mesh Display
            </Typography>
          </Grid>
          <Grid xs={6}>
            <ToggleButtonGroup
              orientation='vertical'
              size='small'
              color='secondary'
              value={viewOptions.meshDisplayMode}
              exclusive
              onChange={onSetMeshDisplayMode}
              aria-label='Mesh Display Mode Selection'
            >
              <ToggleButton value='wireframe'>wireframe</ToggleButton>
              <ToggleButton value='textured'>textured</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
        {viewOptions.meshDisplayMode !== 'wireframe' ? undefined : (
          <FormControlLabel
            control={<Checkbox checked={viewOptions.showPolygonAddresses} />}
            label='Polygon Addresses'
            labelPlacement='start'
            onChange={onSetShowPolygonAddresses}
          />
        )}
        <FormControlLabel
          control={<Checkbox checked={viewOptions.showAxesHelper} />}
          label='Axes Helper'
          labelPlacement='start'
          onChange={onSetShowAxesHelper}
        />
        <FormControlLabel
          control={<Checkbox checked={viewOptions.showSceneCursor} />}
          label='Scene Cursor'
          labelPlacement='start'
          onChange={onSetShowSceneCursor}
        />
      </div>
      {!textures.length ? undefined : (
        <>
          <Divider flexItem>
            <Typography variant='subtitle2' textAlign='left' width='100%'>
              Textures
            </Typography>
          </Divider>
          <div className='textures'>{textures}</div>
        </>
      )}
      <Divider flexItem>
        <Typography variant='subtitle2' textAlign='left' width='100%'>
          Data
        </Typography>
      </Divider>
      <div className='buttons'>
        <Tooltip title='Select an MVC2 or CVS2 STGXY.POL file'>
          <Button
            onClick={openFileSelector}
            color='primary'
            size='small'
            variant='outlined'
          >
            <FileUploadIcon />
            Import
          </Button>
        </Tooltip>
        {!model ? undefined : (
          <Tooltip title='Export ModNao model .json data. Will narrow data down to the current selection'>
            <Button
              onClick={onExportSelection}
              color='secondary'
              size='small'
              variant='outlined'
            >
              <DownloadForOfflineIcon />
              Export
            </Button>
          </Tooltip>
        )}
      </div>
    </StyledDrawer>
  );
}
