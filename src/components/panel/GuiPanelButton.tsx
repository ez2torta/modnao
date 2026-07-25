import React, { ReactNode } from 'react';
import { type BoxProps, Button, ButtonProps, Tooltip } from '@mui/material';

type GuiPanelButtonProps = {
  tooltip: ReactNode | string;
} & ButtonProps;

export default function GuiPanelButton({
  id,
  tooltip,
  color = 'primary',
  onClick,
  children,
  sx,
  ...props
}: GuiPanelButtonProps) {
  return (
    <Tooltip title={tooltip}>
      <Button
        id={id}
        onClick={onClick}
        color={color}
        fullWidth
        size='small'
        variant='outlined'
        sx={sx}
        {...props}
      >
        {children}
      </Button>
    </Tooltip>
  );
}
