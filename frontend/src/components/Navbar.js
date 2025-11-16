import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  LibraryMusic as LibraryMusicIcon,
  Settings as SettingsIcon,
  PermMedia as MediaIcon,
  Publish as PublishIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <AppBar position="static" sx={{ mb: 4 }}>
      <Toolbar>
        <Typography
          variant="h5"
          component="div"
          sx={{ flexGrow: 0, mr: 4, cursor: 'pointer', fontWeight: 700 }}
          onClick={() => navigate('/')}
          data-testid="app-title"
        >
          🎧 Der Bazi mit Baraka
        </Typography>

        <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
          <Button
            color="inherit"
            startIcon={<DashboardIcon />}
            onClick={() => navigate('/')}
            sx={{
              bgcolor: isActive('/') ? 'rgba(255,255,255,0.1)' : 'transparent',
            }}
            data-testid="nav-dashboard"
          >
            Dashboard
          </Button>
          <Button
            color="inherit"
            startIcon={<LibraryMusicIcon />}
            onClick={() => navigate('/episodes')}
            sx={{
              bgcolor: isActive('/episodes') ? 'rgba(255,255,255,0.1)' : 'transparent',
            }}
            data-testid="nav-episodes"
          >
            Episoden
          </Button>
          <Button
            color="inherit"
            startIcon={<MediaIcon />}
            onClick={() => navigate('/media')}
            sx={{
              bgcolor: isActive('/media') ? 'rgba(255,255,255,0.1)' : 'transparent',
            }}
            data-testid="nav-media"
          >
            Medien
          </Button>
        </Box>

        <IconButton color="inherit" data-testid="nav-settings">
          <SettingsIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
