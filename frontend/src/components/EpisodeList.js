import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  Typography,
  Button,
  Grid,
  Chip,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getEpisodes, deleteEpisode } from '../api';

function EpisodeList() {
  const navigate = useNavigate();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEpisodes();
  }, []);

  const loadEpisodes = async () => {
    try {
      const response = await getEpisodes();
      setEpisodes(response.data);
    } catch (error) {
      console.error('Error loading episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (episodeId) => {
    if (window.confirm('Möchten Sie diese Episode wirklich löschen?')) {
      try {
        await deleteEpisode(episodeId);
        loadEpisodes();
      } catch (error) {
        console.error('Error deleting episode:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'processing':
        return 'warning';
      case 'draft':
        return 'default';
      case 'error':
        return 'error';
      default:
        return 'default';
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h3" data-testid="episode-list-title">
          Episoden
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/episodes/new')}
          data-testid="new-episode-button"
        >
          Neue Episode
        </Button>
      </Box>

      {episodes.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" align="center" color="text.secondary">
              Noch keine Episoden vorhanden
            </Typography>
            <Box display="flex" justifyContent="center" mt={2}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<AddIcon />}
                onClick={() => navigate('/episodes/new')}
              >
                Erste Episode erstellen
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {episodes.map((episode) => (
            <Grid item xs={12} key={episode.id}>
              <Card data-testid={`episode-card-${episode.id}`}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={2} mb={1}>
                        <Typography variant="h5">
                          {episode.metadata?.title || 'Unbenannte Episode'}
                        </Typography>
                        <Chip
                          label={episode.status}
                          color={getStatusColor(episode.status)}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Episode #{episode.metadata?.episode_number || 'N/A'}
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 1 }}>
                        {episode.metadata?.description || 'Keine Beschreibung'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Stimme: {episode.selected_voice || 'markus'}
                      </Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                      {episode.audio_url && (
                        <IconButton
                          color="secondary"
                          onClick={() => navigate(`/episodes/${episode.id}`)}
                          data-testid={`play-${episode.id}`}
                        >
                          <PlayIcon />
                        </IconButton>
                      )}
                      <IconButton
                        color="primary"
                        onClick={() => navigate(`/episodes/${episode.id}`)}
                        data-testid={`edit-${episode.id}`}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(episode.id)}
                        data-testid={`delete-${episode.id}`}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}

export default EpisodeList;
