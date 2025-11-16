import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  TextField,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Publish as PublishIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Link as LinkIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { getEpisodes } from '../api';

const PLATFORMS = [
  {
    id: 'spotify',
    name: 'Spotify for Podcasters',
    icon: '🎵',
    url: 'https://podcasters.spotify.com/',
    description: 'Veröffentlichen Sie auf Spotify',
    color: '#1DB954',
  },
  {
    id: 'apple',
    name: 'Apple Podcasts',
    icon: '🍎',
    url: 'https://podcastsconnect.apple.com/',
    description: 'Veröffentlichen Sie auf Apple Podcasts',
    color: '#A855F7',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '▶️',
    url: 'https://studio.youtube.com/',
    description: 'Veröffentlichen Sie auf YouTube',
    color: '#FF0000',
  },
  {
    id: 'google',
    name: 'Google Podcasts',
    icon: '🔊',
    url: 'https://podcastsmanager.google.com/',
    description: 'Veröffentlichen Sie auf Google Podcasts',
    color: '#4285F4',
  },
  {
    id: 'anchor',
    name: 'Anchor.fm',
    icon: '⚓',
    url: 'https://anchor.fm/',
    description: 'Kostenloser Podcast-Hosting-Service',
    color: '#8B5CF6',
  },
  {
    id: 'amazon',
    name: 'Amazon Music',
    icon: '🛒',
    url: 'https://music.amazon.com/podcasts/resources',
    description: 'Veröffentlichen Sie auf Amazon Music',
    color: '#FF9900',
  },
  {
    id: 'podbean',
    name: 'Podbean',
    icon: '🎙️',
    url: 'https://www.podbean.com/',
    description: 'Podcast-Hosting und Distribution',
    color: '#FF6B35',
  },
  {
    id: 'buzzsprout',
    name: 'Buzzsprout',
    icon: '🐝',
    url: 'https://www.buzzsprout.com/',
    description: 'Einfaches Podcast-Hosting',
    color: '#F97316',
  },
];

function Distribution() {
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [message, setMessage] = useState(null);
  const [rssUrl, setRssUrl] = useState('');

  useEffect(() => {
    loadEpisodes();
  }, []);

  const loadEpisodes = async () => {
    try {
      const response = await getEpisodes();
      setEpisodes(response.data.filter(ep => ep.audio_url));
    } catch (error) {
      console.error('Error loading episodes:', error);
    }
  };

  const handlePublish = (platform) => {
    setSelectedPlatform(platform);
    setPublishDialogOpen(true);
  };

  const handleConfirmPublish = () => {
    // Open platform URL in new tab
    window.open(selectedPlatform.url, '_blank');
    setMessage({
      type: 'info',
      text: `Bitte melden Sie sich bei ${selectedPlatform.name} an und laden Sie Ihre Episode hoch. Die Audio-Datei finden Sie in der Medien-Bibliothek.`,
    });
    setPublishDialogOpen(false);
  };

  const generateRssFeed = () => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL;
    const feedUrl = `${backendUrl}/api/rss/feed.xml`;
    setRssUrl(feedUrl);
    setMessage({
      type: 'success',
      text: 'RSS-Feed-URL generiert! Verwenden Sie diese URL bei der Plattform-Anmeldung.',
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" gutterBottom data-testid="distribution-title">
        Distribution & Veröffentlichung
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Veröffentlichen Sie Ihre Podcasts auf allen wichtigen Plattformen
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* RSS Feed Section */}
      <Card sx={{ mb: 4, bgcolor: 'primary.dark' }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            📡 RSS-Feed
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Die meisten Podcast-Plattformen benötigen einen RSS-Feed. Generieren Sie Ihren Feed und verwenden Sie die URL bei der Anmeldung.
          </Typography>
          <Box display="flex" gap={2} alignItems="center" mt={2}>
            <Button
              variant="contained"
              color="secondary"
              onClick={generateRssFeed}
              data-testid="generate-rss-button"
            >
              RSS-Feed Generieren
            </Button>
            {rssUrl && (
              <TextField
                value={rssUrl}
                InputProps={{ readOnly: true }}
                fullWidth
                size="small"
                onClick={(e) => e.target.select()}
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Platforms Grid */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Verfügbare Plattformen
      </Typography>
      <Grid container spacing={3}>
        {PLATFORMS.map((platform) => (
          <Grid item xs={12} sm={6} md={4} key={platform.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'scale(1.02)' },
              }}
              data-testid={`platform-${platform.id}`}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Typography variant="h2">{platform.icon}</Typography>
                  <Typography variant="h6">{platform.name}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {platform.description}
                </Typography>
                <Box mt={2}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handlePublish(platform)}
                    sx={{ bgcolor: platform.color }}
                    startIcon={<PublishIcon />}
                    data-testid={`publish-${platform.id}`}
                  >
                    Veröffentlichen
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Links */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            📚 Hilfreiche Links
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <LinkIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Podcast-Hosting-Anleitung"
                secondary="Erfahren Sie, wie Sie Ihren Podcast auf verschiedenen Plattformen hosten"
              />
              <Button
                size="small"
                onClick={() => window.open('https://www.podcast.de/podcast-hosting/', '_blank')}
              >
                Öffnen
              </Button>
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <LinkIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="RSS-Feed-Anleitung"
                secondary="Wie Sie einen RSS-Feed erstellen und verwenden"
              />
              <Button
                size="small"
                onClick={() => window.open('https://www.rssboard.org/rss-specification', '_blank')}
              >
                Öffnen
              </Button>
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Publish Dialog */}
      <Dialog open={publishDialogOpen} onClose={() => setPublishDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Auf {selectedPlatform?.name} veröffentlichen
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Sie werden zu {selectedPlatform?.name} weitergeleitet.
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
            <strong>Schritte zur Veröffentlichung:</strong>
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText primary="1. Melden Sie sich bei der Plattform an" />
            </ListItem>
            <ListItem>
              <ListItemText primary="2. Erstellen Sie einen neuen Podcast oder wählen Sie einen bestehenden" />
            </ListItem>
            <ListItem>
              <ListItemText primary="3. Laden Sie Ihre Audio-Datei aus der Medien-Bibliothek hoch" />
            </ListItem>
            <ListItem>
              <ListItemText primary="4. Fügen Sie Titel, Beschreibung und Metadaten hinzu" />
            </ListItem>
            <ListItem>
              <ListItemText primary="5. Veröffentlichen Sie die Episode" />
            </ListItem>
          </List>
          {rssUrl && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>RSS-Feed URL:</strong>
              </Typography>
              <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                {rssUrl}
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishDialogOpen(false)}>Abbrechen</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleConfirmPublish}
            data-testid="confirm-publish-button"
          >
            Zur Plattform gehen
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Distribution;
