import {
  Checkbox,
  FormControlLabel,
  Slider,
  styled,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2
import GuiPanelSection from './GuiPanelSection';
import { SyntheticEvent, useCallback, useContext } from 'react';
import ViewOptionsContext, {
  MeshDisplayMode
} from '@/contexts/ViewOptionsContext';
import {
  mdiAxisArrow,
  mdiCodeArray,
  mdiCursorDefaultOutline,
  mdiFlipToBack,
  mdiTangram
} from '@mdi/js';
import Icon from '@mdi/react';
import PaletteEditor from './PaletteEditor';

const Styled = styled('div')(
  {
    shouldForwardProp: (prop: string) =>
      prop !== 'textColor' && prop !== 'buttonTextColor'
  },
  ({ theme }) => `
  & .MuiSlider-root {
    width: calc(100% - 124px);
    margin-left: ${theme.spacing(2)};
    margin-right: ${theme.spacing(1)};
  }
  
  & .display-mode {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  & .settings-row .MuiTypography-root.MuiFormControlLabel-label {
    display: flex;
    align-items: center;
  }
  
  & .settings-row .MuiTypography-root.MuiFormControlLabel-label > svg {
    margin-right: -2px;
  }

  & .experimental-divider {
    width: 100%;
    height: 1px;
    border-bottom: ${theme.palette.error.main} 1px dashed;
  }
  `
);

export default function GuiPanelViewOptions() {
  const viewOptions = useContext(ViewOptionsContext);

  const onSetMeshDisplayMode = useCallback(
    (_: React.MouseEvent<HTMLElement>, mode: MeshDisplayMode) => {
      mode && viewOptions.setMeshDisplayMode(mode);
    },
    [viewOptions.setMeshDisplayMode]
  );

  const onSetAxesHelperVisible = useCallback(
    (_: SyntheticEvent<Element, Event>, value: boolean) => {
      viewOptions.setAxesHelperVisible(value);
    },
    [viewOptions.setAxesHelperVisible]
  );

  const onSetObjectAddressesVisible = useCallback(
    (_: SyntheticEvent<Element, Event>, value: boolean) => {
      viewOptions.setObjectAddressesVisible(value);
    },
    [viewOptions.setObjectAddressesVisible]
  );

  const onSetWireframeLineWidth = useCallback(
    (_: Event, v: number | number[]) => {
      const value = typeof v === 'number' ? v : v[0];
      viewOptions.setWireframeLineWidth(value);
    },
    [viewOptions.setWireframeLineWidth]
  );

  const onSetSceneCursorVisible = useCallback(
    (_: SyntheticEvent<Element, Event>, value: boolean) => {
      viewOptions.setSceneCursorVisible(value);
    },
    [viewOptions.setSceneCursorVisible]
  );

  const onSetDisableBackfaceCulling = useCallback(
    (_: SyntheticEvent<Element, Event>, value: boolean) => {
      viewOptions.setDisableBackfaceCulling(value);
    },
    [viewOptions.setDisableBackfaceCulling]
  );

  const onSetUvRegionsHighlighted = useCallback(
    (_: SyntheticEvent<Element, Event>, value: boolean) => {
      viewOptions.setUvRegionsHighlighted(value);
    },
    [viewOptions.uvRegionsHighlighted]
  );

  const onSetDevOptionsVisible = useCallback(
    (_: SyntheticEvent<Element, Event>, value: boolean) => {
      viewOptions.setDevOptionsVisible(value);
    },
    [viewOptions.devOptionsVisible]
  );

  return (
    <GuiPanelSection title='View Options'>
      <Styled className='view-options'>
        <Grid container className='property-table'>
          <Grid xs={12} className='display-mode'>
            <ToggleButtonGroup
              orientation='horizontal'
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
        <PaletteEditor />
        {viewOptions.meshDisplayMode !== 'wireframe' ? undefined : (
          <FormControlLabel
            control={
              <Slider
                size='small'
                min={1}
                max={10}
                defaultValue={4}
                aria-label='Small'
                valueLabelDisplay='auto'
                value={viewOptions.wireframeLineWidth}
                onChange={onSetWireframeLineWidth}
              />
            }
            label='Line Width'
            labelPlacement='start'
          />
        )}
        {viewOptions.meshDisplayMode !== 'wireframe' ? undefined : (
          <Tooltip
            title='Toggle selected polygon addresess visibility'
            placement='top-start'
          >
            <FormControlLabel
              control={
                <Checkbox checked={viewOptions.objectAddressesVisible} />
              }
              label='Addresses'
              labelPlacement='start'
              onChange={onSetObjectAddressesVisible}
            />
          </Tooltip>
        )}
        <div className='settings-row'>
          <Tooltip title='Toggle axes helper visibility'>
            <FormControlLabel
              control={<Checkbox checked={viewOptions.axesHelperVisible} />}
              label={<Icon path={mdiAxisArrow} size={1} />}
              labelPlacement='start'
              onChange={onSetAxesHelperVisible}
            />
          </Tooltip>
          <Tooltip title='Toggle scene cursor visibility'>
            <FormControlLabel
              control={<Checkbox checked={viewOptions.sceneCursorVisible} />}
              label={<Icon path={mdiCursorDefaultOutline} size={1} />}
              labelPlacement='start'
              onChange={onSetSceneCursorVisible}
            />
          </Tooltip>
        </div>
        <div className='settings-row'>
          <Tooltip title='Disable Backface Culling / Make material visible on both sides of polygons'>
            <FormControlLabel
              control={
                <Checkbox checked={viewOptions.disableBackfaceCulling} />
              }
              label={<Icon path={mdiFlipToBack} size={1} />}
              labelPlacement='start'
              onChange={onSetDisableBackfaceCulling}
            />
          </Tooltip>
          <Tooltip
            title={
              'View UV Clipping Regions when selecting a polygon that has an ' +
              'associated texture loaded.'
            }
          >
            <FormControlLabel
              control={<Checkbox checked={viewOptions.uvRegionsHighlighted} />}
              label={<Icon path={mdiTangram} size={1} />}
              labelPlacement='start'
              onChange={onSetUvRegionsHighlighted}
            />
          </Tooltip>
        </div>
        <div className='settings-row'>
          <Tooltip title='Enable developer/debug option visibility'>
            <FormControlLabel
              control={<Checkbox checked={viewOptions.devOptionsVisible} />}
              label={<Icon path={mdiCodeArray} size={1} />}
              labelPlacement='start'
              onChange={onSetDevOptionsVisible}
            />
          </Tooltip>
        </div>
      </Styled>
    </GuiPanelSection>
  );
}
