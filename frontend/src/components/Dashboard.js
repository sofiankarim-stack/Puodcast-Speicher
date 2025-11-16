import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Container,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  BarChart as BarChartIcon,
  Publish as PublishIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../api';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" gutterBottom data-testid="dashboard-title">
        Dashboard
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Der Bazi mit Baraka - Podcast Produktionsplattform
      </Typography>

      {/* Quick Action Buttons */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'scale(1.02)' },
            }}
            onClick={() => navigate('/episodes/new')}
            data-testid="new-episode-card"
          >
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <AddIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Typography variant="h5">Neue Episode</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Starte eine neue Podcast-Episode
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'scale(1.02)' },
            }}
            onClick={() => navigate('/episodes')}
            data-testid="episodes-card"
          >
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <BarChartIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Typography variant="h5">Episoden</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Verwalte deine Episoden
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'scale(1.02)' },
            }}
            data-testid="publish-card"
          >
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PublishIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Typography variant="h5">Veröffentlichen</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Veröffentliche auf allen Plattformen
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={3}>
          <Card data-testid="total-episodes-stat">
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Gesamt Episoden
              </Typography>
              <Typography variant="h3" color="primary">
                {stats?.total_episodes || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card data-testid="published-episodes-stat">
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Veröffentlicht
              </Typography>
              <Typography variant="h3" color="success.main">
                {stats?.published_episodes || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card data-testid="total-downloads-stat">
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Downloads
              </Typography>
              <Typography variant="h3" color="secondary">
                {stats?.total_downloads || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card data-testid="average-listeners-stat">
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Ø Hörer
              </Typography>
              <Typography variant="h3">
                {stats?.average_listeners || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Episodes */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Letzte Episoden
        </Typography>
        <Grid container spacing={2}>
          {stats?.recent_episodes?.length > 0 ? (
            stats.recent_episodes.map((episode) => (
              <Grid item xs={12} key={episode.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => navigate(`/episodes/${episode.id}`)}
                  data-testid={`episode-${episode.id}`}
                >
                  <CardContent>
                    <Typography variant="h6">{episode.metadata?.title || 'Unbenannte Episode'}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Episode #{episode.metadata?.episode_number} - {episode.status}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Typography variant="body1" color="text.secondary">
                Noch keine Episoden vorhanden
              </Typography>
            </Grid>
          )}
        </Grid>
      </Box>
    </Container>
  );
}

export default Dashboard;
