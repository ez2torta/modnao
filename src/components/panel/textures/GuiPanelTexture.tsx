import { useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import clsx from 'clsx';
import Img from 'next/image';
import { Image } from 'image-js';
import { Skeleton, styled, Typography } from '@mui/material';
import { NLTextureDef } from '@/types/NLAbstractions';
import GuiPanelTextureMenu from './GuiPanelTextureMenu';
import { selectMesh, useAppDispatch, useAppSelector } from '@/store';
import { SourceTextureData } from '@/utils/textures/SourceTextureData';
import { selectReplacementTexture } from '@/store/replaceTextureSlice';

const IMG_SIZE = '170px';

const StyledPanelTexture = styled('div')(
  ({ theme }) =>
    `& {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      width: 100%;
      background-color: ${theme.palette.panelTexture.background};
  }
      
  & .image-area {
    position: relative;
    display: flex;
    width: 100%;
  }

  & .image-area.active:after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: ${theme.palette.secondary.light};
    border: 3px solid ${theme.palette.secondary.main};
    mix-blend-mode: hard-light;
    opacity: 0.75;
    pointer-events: none;
  }
    
  & .img {
    width: ${IMG_SIZE};
    height: ${IMG_SIZE};
    border-color: transparent;
    border-width: 3px;
    border-style: solid;
    opacity: 1.0;
    transform: rotate(-90deg);
  }

  & .selected .img {
    filter: saturate(0); darken(50);
    border-color: ${theme.palette.primary.main};
  }

  .uv-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: ${IMG_SIZE};
    height: ${IMG_SIZE};
  }

  .uv-overlay img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    transform: rotate(-90deg);
  }

  & .size-notation {
    position: absolute;
    right: ${theme.spacing(1)};
    bottom: ${theme.spacing(1)};
    color: ${theme.palette.primary.contrastText};
    text-shadow: 1px 1px 1px black;
    filter: drop-shadow(3px 3px 1px black);
  }
  `
);

export type GuiPanelTextureProps = {
  selected: boolean;
  textureDef: NLTextureDef;
  textureIndex: number;
};

export default function GuiPanelTexture({
  selected,
  textureIndex,
  textureDef
}: GuiPanelTextureProps) {
  const dispatch = useAppDispatch();
  const mesh = useAppSelector(selectMesh);

  const uvClipPaths = useMemo<string[]>(() => {
    if (selected && mesh?.polygons.length) {
      return mesh.polygons.map((p) => {
        let path = '';

        p.indices.forEach((index, i, arr) => {
          const v = p.vertices[index];
          path +=
            (v.uv[0] * 100).toFixed(2) +
            '% ' +
            (100 - v.uv[1] * 100).toFixed(2) +
            '%' +
            (i === arr.length - 1 ? '' : ', ');
        });

        return path;
      });
    } else {
      return [];
    }
  }, [selected && mesh?.polygons]);

  const onSelectNewImageFile = useCallback(
    async (imageFile: File) => {
      dispatch(
        selectReplacementTexture({
          imageFile,
          textureIndex
        })
      );
    },
    [textureIndex, textureDef.bufferUrls.translucent]
  );

  const onDrop = useCallback(
    async ([file]: File[]) => {
      onSelectNewImageFile(file);
    },
    [onSelectNewImageFile]
  );

  const { getRootProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    noClick: true,
    accept: {
      'image/bmp': ['.bmp'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif']
    }
  });

  const { width, height } = textureDef;

  // if there's a currently selected mesh and it's opaque, prioritize opaque,
  // otherwise fallback to actionable dataUrl
  const imageDataUrl =
    (selected && mesh?.isOpaque
      ? textureDef.dataUrls.opaque || textureDef.dataUrls.translucent
      : textureDef.dataUrls.translucent || textureDef.dataUrls.opaque) || '';

  return (
    <StyledPanelTexture>
      <div
        id={`gui-panel-t-${textureIndex}`}
        className={clsx(
          'image-area',
          selected && 'selected',
          isDragActive && 'active'
        )}
        {...getRootProps()}
      >
        {!imageDataUrl ? (
          <Skeleton variant='rectangular' height={170} width='100%' />
        ) : (
          <Img
            src={imageDataUrl}
            width={width}
            height={height}
            alt={`Texture # ${textureIndex}`}
            className='img'
          />
        )}
        {!uvClipPaths.length ? undefined : (
          <>
            {uvClipPaths.map((path: string, i) => (
              <div
                className='uv-overlay'
                key={i}
                style={{ clipPath: `polygon(${path})` }}
              >
                <Image
                  src={imageDataUrl}
                  width={width}
                  height={height}
                  className='uv-highlight'
                  alt='UV Highlight'
                />
              </div>
            ))}
          </>
        )}
        <Typography
          variant='subtitle2'
          textAlign='right'
          className='size-notation'
        >
          {textureDef.width}x{textureDef.height} [{textureIndex}]
        </Typography>
        <GuiPanelTextureMenu
          textureIndex={textureIndex}
          width={textureDef.width}
          height={textureDef.height}
          pixelsObjectUrls={textureDef.bufferUrls as SourceTextureData}
          onReplaceImageFile={onSelectNewImageFile}
        />
      </div>
    </StyledPanelTexture>
  );
}
