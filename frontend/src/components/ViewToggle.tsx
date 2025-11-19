import React from 'react';
import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ListIcon from '@mui/icons-material/List';

interface ViewToggleProps {
  view: 'graph' | 'list';
  onChange: (view: 'graph' | 'list') => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ view, onChange }) => {
  return (
    <ToggleButtonGroup
      value={view}
      exclusive
      onChange={(_, newView) => newView && onChange(newView)}
      size="small"
    >
      <ToggleButton value="graph">
        <Tooltip title="Graph View">
          <AccountTreeIcon />
        </Tooltip>
      </ToggleButton>
      <ToggleButton value="list">
        <Tooltip title="List View">
          <ListIcon />
        </Tooltip>
      </ToggleButton>
    </ToggleButtonGroup>
  );
};

export default ViewToggle;
