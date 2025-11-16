import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Save as SaveIcon,
  VolumeUp as VolumeIcon,
  Lightbulb as LightbulbIcon,
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createEpisode,
  updateEpisode,
  getEpisode,
  getVoices,
  generateTTS,
  generateEpisodeAudio,
  getChatGPTSuggestion,
} from '../api';
import AudioEditor from './AudioEditor';
import FileUploader from './FileUploader';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function EpisodeEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [voices, setVoices] = useState([]);
  const [audioUrl, setAudioUrl] = useState(null);
  const [message, setMessage] = useState(null);

  const [formData, setFormData] = useState({
    text_content: '',
    metadata: {
      title: '',
      description: '',
      episode_number: null,
      category: 'Podcast',
      host: 'Der Bazi mit Baraka',
      guests: [],
      tags: [],
    },
    selected_voice: 'markus',
    voice_settings: {
      stability: 0.75,
      similarity_boost: 0.85,
      style: 0.0,
      use_speaker_boost: true,
    },
  });

  useEffect(() => {
    loadVoices();
    if (isEdit) {
      loadEpisode();
    }
  }, [id]);

  const loadVoices = async () => {
    try {
      const response = await getVoices();
      setVoices(response.data.voices);
    } catch (error) {
      console.error('Error loading voices:', error);
    }
  };

  const loadEpisode = async () => {
    setLoading(true);
    try {
      const response = await getEpisode(id);
      setFormData(response.data);
      if (response.data.audio_url) {
        setAudioUrl(`${BACKEND_URL}${response.data.audio_url}`);
      }
    } catch (error) {
      console.error('Error loading episode:', error);
      setMessage({ type: 'error', text: 'Fehler beim Laden der Episode' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isEdit) {
        await updateEpisode(id, formData);
        setMessage({ type: 'success', text: 'Episode erfolgreich aktualisiert!' });
      } else {
        const response = await createEpisode(formData);
        setMessage({ type: 'success', text: 'Episode erfolgreich erstellt!' });
        setTimeout(() => {
          navigate(`/episodes/${response.data.id}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving episode:', error);
      setMessage({ type: 'error', text: 'Fehler beim Speichern der Episode' });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!formData.text_content) {
      setMessage({ type: 'error', text: 'Bitte geben Sie zuerst Text ein' });
      return;
    }

    setGenerating(true);
    setMessage({ type: 'info', text: 'Audio wird generiert... Dies kann einige Minuten dauern.' });

    try {
      if (isEdit) {
        const response = await generateEpisodeAudio(id);
        setAudioUrl(`${BACKEND_URL}${response.data.audio_url}`);
        setMessage({ type: 'success', text: 'Audio erfolgreich generiert!' });
      } else {
        // For new episodes, save first then generate
        const saveResponse = await createEpisode(formData);
        const audioResponse = await generateEpisodeAudio(saveResponse.data.id);
        setAudioUrl(`${BACKEND_URL}${audioResponse.data.audio_url}`);
        setMessage({ type: 'success', text: 'Audio erfolgreich generiert!' });
        navigate(`/episodes/${saveResponse.data.id}`);
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      
      // Show detailed error message
      let errorMessage = 'Fehler bei der Audio-Generierung';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.status === 402) {
        errorMessage = 'ElevenLabs Free-Tier-Limit erreicht. Bitte verwenden Sie einen Paid Plan API-Key.';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setGenerating(false);
    }
  };

  const handleGetSuggestion = async (field) => {
    try {
      let prompt = '';
      if (field === 'title') {
        prompt = `Erstelle einen kreativen und ansprechenden Podcast-Titel basierend auf diesem Inhalt: ${formData.text_content.substring(0, 500)}...`;
      } else if (field === 'description') {
        prompt = `Erstelle eine kurze, ansprechende Beschreibung (2-3 Sätze) für eine Podcast-Episode mit dem Titel "${formData.metadata.title}" und diesem Inhalt: ${formData.text_content.substring(0, 500)}...`;
      }

      const response = await getChatGPTSuggestion({ prompt, context: formData.text_content });
      const suggestion = response.data.suggestion;

      if (field === 'title') {
        setFormData({
          ...formData,
          metadata: { ...formData.metadata, title: suggestion },
        });
      } else if (field === 'description') {
        setFormData({
          ...formData,
          metadata: { ...formData.metadata, description: suggestion },
        });
      }

      setMessage({ type: 'success', text: 'Vorschlag generiert!' });
    } catch (error) {
      console.error('Error getting suggestion:', error);
      setMessage({ type: 'error', text: 'Fehler beim Generieren des Vorschlags' });
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
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/episodes')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h3" data-testid="episode-editor-title">
          {isEdit ? 'Episode Bearbeiten' : 'Neue Episode'}
        </Typography>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Text Content */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Episode Text
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={15}
                placeholder="Schreiben Sie Ihren Podcast-Text hier... Sie können mehrere Sprecher mit [MARKUS], [KLAUS], [FRANZ] oder [JOSEF] markieren."
                value={formData.text_content}
                onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                variant="outlined"
                sx={{ mt: 2 }}
                data-testid="text-content-input"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Zeichen: {formData.text_content.length} | Wörter: {formData.text_content.split(/\s+/).filter(Boolean).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Metadata */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Metadaten
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <TextField
                  fullWidth
                  label="Episode Titel"
                  value={formData.metadata.title}
                  onChange={(e) => setFormData({
                    ...formData,
                    metadata: { ...formData.metadata, title: e.target.value },
                  })}
                  variant="outlined"
                  data-testid="title-input"
                />
                <IconButton
                  color="secondary"
                  onClick={() => handleGetSuggestion('title')}
                  title="KI-Vorschlag"
                  data-testid="title-suggestion-button"
                >
                  <LightbulbIcon />
                </IconButton>
              </Box>

              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <TextField
                  fullWidth
                  label="Beschreibung"
                  multiline
                  rows={3}
                  value={formData.metadata.description}
                  onChange={(e) => setFormData({
                    ...formData,
                    metadata: { ...formData.metadata, description: e.target.value },
                  })}
                  variant="outlined"
                  data-testid="description-input"
                />
                <IconButton
                  color="secondary"
                  onClick={() => handleGetSuggestion('description')}
                  title="KI-Vorschlag"
                  data-testid="description-suggestion-button"
                >
                  <LightbulbIcon />
                </IconButton>
              </Box>

              <TextField
                fullWidth
                label="Kategorie"
                value={formData.metadata.category}
                onChange={(e) => setFormData({
                  ...formData,
                  metadata: { ...formData.metadata, category: e.target.value },
                })}
                variant="outlined"
                sx={{ mb: 2 }}
                data-testid="category-input"
              />

              <TextField
                fullWidth
                label="Host"
                value={formData.metadata.host}
                onChange={(e) => setFormData({
                  ...formData,
                  metadata: { ...formData.metadata, host: e.target.value },
                })}
                variant="outlined"
                data-testid="host-input"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Voice Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Stimmen-Einstellungen
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Haupt-Stimme</InputLabel>
                <Select
                  value={formData.selected_voice}
                  label="Haupt-Stimme"
                  onChange={(e) => setFormData({ ...formData, selected_voice: e.target.value })}
                  data-testid="voice-select"
                >
                  {voices.map((voice) => (
                    <MenuItem key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography gutterBottom>Stabilität: {Math.round(formData.voice_settings.stability * 100)}%</Typography>
              <Slider
                value={formData.voice_settings.stability}
                onChange={(e, value) => setFormData({
                  ...formData,
                  voice_settings: { ...formData.voice_settings, stability: value },
                })}
                min={0}
                max={1}
                step={0.01}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                sx={{ mb: 2 }}
                data-testid="stability-slider"
              />

              <Typography gutterBottom>Klarheit: {Math.round(formData.voice_settings.similarity_boost * 100)}%</Typography>
              <Slider
                value={formData.voice_settings.similarity_boost}
                onChange={(e, value) => setFormData({
                  ...formData,
                  voice_settings: { ...formData.voice_settings, similarity_boost: value },
                })}
                min={0}
                max={1}
                step={0.01}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                sx={{ mb: 2 }}
                data-testid="clarity-slider"
              />

              <Typography gutterBottom>Stil: {Math.round(formData.voice_settings.style * 100)}%</Typography>
              <Slider
                value={formData.voice_settings.style}
                onChange={(e, value) => setFormData({
                  ...formData,
                  voice_settings: { ...formData.voice_settings, style: value },
                })}
                min={0}
                max={1}
                step={0.01}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                data-testid="style-slider"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Audio Preview */}
        {audioUrl && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Audio Vorschau
                </Typography>
                <audio controls src={audioUrl} style={{ width: '100%' }} data-testid="audio-player" />
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Action Buttons */}
        <Grid item xs={12}>
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving || !formData.text_content || !formData.metadata.title}
              data-testid="save-button"
            >
              {saving ? 'Speichert...' : 'Speichern'}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<VolumeIcon />}
              onClick={handleGenerateAudio}
              disabled={generating || !formData.text_content}
              data-testid="generate-audio-button"
            >
              {generating ? <CircularProgress size={24} /> : 'Audio Generieren'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

export default EpisodeEditor;
