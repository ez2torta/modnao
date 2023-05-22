import { useState, MouseEvent, useMemo } from 'react';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { styled } from '@mui/material';

const StyledPanelTextureMenu = styled('div')(
  ({ theme }) => `& {
        position: absolute;
        top: ${theme.spacing(1)};
        right: ${theme.spacing(0)};
    }

    & .MuiSvgIcon-root {
        color: #fff;
        filter: drop-shadow(3px 5px 2px rgb(0 0 0 / 0.8));
    }
    `
);

export default function GuiPanelTextureMenu({
  textureIndex,
  dataUrl
}: {
  textureIndex: number;
  dataUrl: string;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const options = useMemo(
    () => [
      {
        label: 'Download',
        onClick: () => {
          const a = document.createElement('a');
          a.download = `modNaoTexture${textureIndex}.png`;
          console.log('dataUrl ->', dataUrl);
          a.href = dataUrl;
          a.click();
        }
      },
      {
        label: 'Replace',
        onClick: () => null
      }
    ],
    [dataUrl, textureIndex]
  );

  return (
    <StyledPanelTextureMenu>
      <IconButton
        color='primary'
        aria-controls={open ? 'long-menu' : undefined}
        aria-expanded={open ? 'true' : undefined}
        aria-haspopup='true'
        onClick={handleClick}
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        id='long-menu'
        MenuListProps={{
          'aria-labelledby': 'long-button'
        }}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        {options.map((option) => (
          <MenuItem
            key={option.label}
            disabled={option.label === 'Replace'}
            onClick={option.onClick}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </StyledPanelTextureMenu>
  );
}
