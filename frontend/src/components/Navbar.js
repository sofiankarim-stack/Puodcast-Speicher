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
    <AppBar position="static" sx={{ mb: { xs: 2, md: 4 } }}>
      <Toolbar sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' }, py: { xs: 1, md: 2 } }}>
        <Typography
          variant="h5"
          component="div"
          sx={{ 
            flexGrow: 0, 
            mr: { xs: 1, md: 4 }, 
            cursor: 'pointer', 
            fontWeight: 700,
            fontSize: { xs: '1rem', md: '1.5rem' },
          }}
          onClick={() => navigate('/')}
          data-testid="app-title"
        >
          🎧 Der Bazi
        </Typography>

        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          gap: { xs: 0.5, md: 2 },
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          width: { xs: '100%', md: 'auto' },
        }}>
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
          <Button
            color="inherit"
            startIcon={<PublishIcon />}
            onClick={() => navigate('/distribution')}
            sx={{
              bgcolor: isActive('/distribution') ? 'rgba(255,255,255,0.1)' : 'transparent',
            }}
            data-testid="nav-distribution"
          >
            Veröffentlichen
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
