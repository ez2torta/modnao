import {
  MutableRefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import {
  selectModel,
  selectObjectKey,
  selectObjectSelectionType,
  selectSceneTextureDefs
} from '@/store/selectors';
import { setObjectKey, useAppDispatch, useAppSelector } from '@/store';
import RenderedMesh from './RenderedMesh';
import { useSceneKeyboardControls } from '@/hooks';
import ViewOptionsContext from '@/contexts/ViewOptionsContext';
import { useTheme } from '@mui/material';
import { SceneContextSetup } from '@/contexts/SceneContext';
import {
  EffectComposer,
  Outline,
  Selection
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

THREE.ColorManagement.enabled = true;

const cameraParams = { far: 5000000 };

export default function SceneCanvas() {
  useSceneKeyboardControls();
  const canvasRef = useRef() as MutableRefObject<HTMLCanvasElement>;
  const viewOptions = useContext(ViewOptionsContext);

  const dispatch = useAppDispatch();
  const objectKey = useAppSelector(selectObjectKey);
  const objectSelectionType = useAppSelector(selectObjectSelectionType);
  const onSelectObjectKey = useCallback(
    (key: string) => {
      dispatch(setObjectKey(objectKey !== key ? key : undefined));
    },
    [objectKey]
  );

  const textureDefs = useAppSelector(selectSceneTextureDefs);
  const model = useAppSelector(selectModel);
  const theme = useTheme();

  const canvasStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      top: '0',
      left: '0',
      background: theme.palette.scene.background,
      cursor: viewOptions.sceneCursorVisible ? 'default' : 'none'
    }),
    [viewOptions.sceneCursorVisible, theme]
  );

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;

      const canvas = canvasRef.current?.childNodes[0] as HTMLCanvasElement;
      if (canvas) {
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
    });

    const containerElement = canvasRef.current;
    resizeObserver.observe(containerElement);

    return () => resizeObserver.unobserve(containerElement);
  }, []);

  return (
    <Canvas
      camera={cameraParams}
      frameloop='demand'
      style={canvasStyle}
      ref={canvasRef}
    >
      <Selection
        enabled={
          viewOptions.meshDisplayMode === 'textured' && Boolean(objectKey)
        }
      >
        <EffectComposer autoClear={false} key={objectKey}>
          <Outline
            edgeStrength={30}
            pulseSpeed={1}
            blendFunction={BlendFunction.SCREEN}
            visibleEdgeColor={theme.palette.scene.selected as unknown as number}
            hiddenEdgeColor={theme.palette.scene.selected as unknown as number}
          />
        </EffectComposer>
        <SceneContextSetup />
        <group dispose={null}>
          {!viewOptions.axesHelperVisible ? undefined : (
            <axesHelper args={[50]} />
          )}
          {(model?.meshes || []).map((m, i) => (
            <RenderedMesh
              key={m.address}
              {...m}
              objectKey={`${i}`}
              selectedObjectKey={objectKey}
              objectSelectionType={objectSelectionType}
              onSelectObjectKey={onSelectObjectKey}
              textureDefs={textureDefs}
            />
          ))}
          <OrbitControls />
        </group>
      </Selection>
    </Canvas>
  );
}
