import React, { useState } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  Typography,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { useNetworkSearch } from '../hooks/useNetworkData';

interface SearchBarProps {
  onResultSelect?: (result: any) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onResultSelect }) => {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const { data: results = [], isLoading } = useNetworkSearch(query);

  const handleSearch = (value: string) => {
    setQuery(value);
    setShowResults(value.length > 0);
  };

  const handleClear = () => {
    setQuery('');
    setShowResults(false);
  };

  const handleResultClick = (result: any) => {
    onResultSelect?.(result);
    setShowResults(false);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 600 }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search IPs, services, protocols..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: query && (
            <InputAdornment position="end">
              {isLoading ? (
                <CircularProgress size={20} />
              ) : (
                <IconButton size="small" onClick={handleClear}>
                  <CloseIcon />
                </IconButton>
              )}
            </InputAdornment>
          )
        }}
      />

      {/* Search Results */}
      {showResults && (
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 1,
            maxHeight: 400,
            overflow: 'auto',
            zIndex: 1000
          }}
        >
          {results.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {isLoading ? 'Searching...' : 'No results found'}
              </Typography>
            </Box>
          ) : (
            <List>
              {results.slice(0, 20).map((result, idx) => (
                <ListItem
                  key={idx}
                  button
                  onClick={() => handleResultClick(result)}
                  divider
                >
                  <ListItemText
                    primary={`${result.id?.orig_h || 'Unknown'} → ${result.id?.resp_h || 'Unknown'}`}
                    secondary={`${result.proto || 'N/A'} | Port: ${result.id?.resp_p || 'N/A'} | Service: ${result.service || 'N/A'}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default SearchBar;
