import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Tabs,
  Tab,
  Typography,
  Grid,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Slider,
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Image as ImageIcon,
  AudioFile as AudioIcon,
  VideoFile as VideoIcon,
  Download as DownloadIcon,
  AutoFixHigh as EnhanceIcon,
} from '@mui/icons-material';
import { getMusicLibrary, enhanceAudio } from '../api';
import AudioEditor from './AudioEditor';
import VideoEditor from './VideoEditor';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function MediaLibrary({ onSelectFile }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState(0);
  const [enhanceSettings, setEnhanceSettings] = useState({
    removeNoise: true,
    normalize: true,
    compression: 0.5,
    bassBoost: 0,
    trebleBoost: 0,
  });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const response = await getMusicLibrary();
      setFiles(response.data);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (['mp3', 'wav', 'ogg', 'aac'].includes(ext)) return <AudioIcon />;
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return <VideoIcon />;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <ImageIcon />;
    return <AudioIcon />;
  };

  const handleEdit = (file) => {
    setSelectedFile(file);
    setDialogTab(0); // Reset to preview tab
    setEditDialogOpen(true);
  };

  const handleEnhance = async () => {
    if (!selectedFile) return;
    
    // Check if file is audio
    const isAudio = selectedFile.name?.toLowerCase().match(/\\.(mp3|wav|ogg|aac|m4a)$/);
    if (!isAudio) {
      setMessage({ 
        type: 'warning', 
        text: 'Audio-Optimierung ist nur für Audio-Dateien verfügbar. Für Videos verwenden Sie bitte den Video-Editor.' 
      });
      return;
    }
    
    setMessage({ type: 'info', text: 'Audio wird optimiert...' });
    
    try {
      const response = await enhanceAudio({
        file_id: selectedFile.id,
        remove_noise: enhanceSettings.removeNoise,
        normalize: enhanceSettings.normalize,
        compression: enhanceSettings.compression,
        bass_boost: enhanceSettings.bassBoost,
        treble_boost: enhanceSettings.trebleBoost,
      });
      
      setMessage({ type: 'success', text: response.data.message || 'Audio-Qualität erfolgreich verbessert!' });
      loadFiles(); // Reload to show enhanced file
      setTimeout(() => {
        setEditDialogOpen(false);
      }, 1500);
    } catch (error) {
      console.error('Enhancement error:', error);
      const errorMsg = error.response?.data?.detail || 'Fehler bei der Audio-Optimierung. Bitte versuchen Sie es erneut.';
      setMessage({ type: 'error', text: errorMsg });
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom data-testid="media-library-title">
        Medien-Bibliothek
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Alle hochgeladenen Audio-, Video- und Bild-Dateien
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {loading ? (
        <Typography>Lädt...</Typography>
      ) : files.length === 0 ? (
        <Card>
          <CardContent>
            <Typography align="center" color="text.secondary">
              Noch keine Dateien hochgeladen
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {files.map((file) => (
            <Grid item xs={12} sm={6} md={4} key={file.id}>
              <Card data-testid={`media-file-${file.id}`}>
                <CardContent>
                  {/* Thumbnail/Preview */}
                  <Box
                    sx={{
                      width: '100%',
                      height: 150,
                      bgcolor: '#000',
                      borderRadius: 1,
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {file.name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) && (
                      <img
                        src={`${BACKEND_URL}${file.file_url}`}
                        alt={file.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                    {file.name?.toLowerCase().match(/\.(mp4|mov|avi|webm)$/) && (
                      <VideoIcon sx={{ fontSize: 60, color: 'secondary.main' }} />
                    )}
                    {file.name?.toLowerCase().match(/\.(mp3|wav|ogg|aac)$/) && (
                      <AudioIcon sx={{ fontSize: 60, color: 'secondary.main' }} />
                    )}
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    {getFileIcon(file.name)}
                    <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
                      {file.name}
                    </Typography>
                  </Box>
                  
                  <Chip
                    label={file.category}
                    size="small"
                    color="primary"
                    sx={{ mb: 1 }}
                  />
                  
                  <Typography variant="caption" color="text.secondary" display="block">
                    Größe: {formatFileSize(file.duration)}
                  </Typography>

                  <Box display="flex" gap={1} mt={2}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEdit(file)}
                      title="Bearbeiten"
                      data-testid={`edit-file-${file.id}`}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="secondary"
                      onClick={() => handleEnhance()}
                      title="Qualität verbessern"
                      data-testid={`enhance-file-${file.id}`}
                    >
                      <EnhanceIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => window.open(`${BACKEND_URL}${file.file_url}`, '_blank')}
                      title="Herunterladen"
                    >
                      <DownloadIcon />
                    </IconButton>
                    {onSelectFile && (
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => onSelectFile(file)}
                        title="Verwenden"
                      >
                        <PlayIcon />
                      </IconButton>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Datei bearbeiten: {selectedFile?.name}
        </DialogTitle>
        <DialogContent>
          {selectedFile && selectedFile.file_url && (
            <Box>
              {/* Tabs */}
              <Tabs value={dialogTab} onChange={(e, val) => setDialogTab(val)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Vorschau" data-testid="preview-tab" />
                <Tab label="Bearbeiten" data-testid="edit-tab" />
                <Tab label="Qualität" data-testid="quality-tab" />
              </Tabs>

              {/* Tab 0: Preview Section */}
              {dialogTab === 0 && (
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  Vorschau
                </Typography>
                <Card sx={{ bgcolor: '#000', p: 2 }}>
                  {/* Audio Preview */}
                  {selectedFile.name?.toLowerCase().match(/\.(mp3|wav|ogg|aac|m4a)$/) && (
                    <audio
                      controls
                      src={`${BACKEND_URL}${selectedFile.file_url}`}
                      style={{ width: '100%' }}
                      data-testid="audio-preview"
                    />
                  )}
                  
                  {/* Video Preview */}
                  {selectedFile.name?.toLowerCase().match(/\.(mp4|mov|avi|webm)$/) && (
                    <video
                      controls
                      src={`${BACKEND_URL}${selectedFile.file_url}`}
                      style={{ width: '100%', maxHeight: '400px' }}
                      data-testid="video-preview"
                    />
                  )}
                  
                  {/* Image Preview */}
                  {selectedFile.name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) && (
                    <img
                      src={`${BACKEND_URL}${selectedFile.file_url}`}
                      alt={selectedFile.name}
                      style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }}
                      data-testid="image-preview"
                    />
                  )}
                </Card>
              </Box>
              )}

              {/* Tab 1: Edit Section */}
              {dialogTab === 1 && (
              <Box>
              {/* Audio Editor */}
              {selectedFile.name?.toLowerCase().match(/\.(mp3|wav|ogg|aac)$/) && (
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    Audio Bearbeiten
                  </Typography>
                  <AudioEditor
                    audioUrl={`${BACKEND_URL}${selectedFile.file_url}`}
                    onSave={(regions) => {
                      console.log('Audio edits:', regions);
                      setMessage({ type: 'success', text: 'Änderungen gespeichert!' });
                    }}
                  />
                </Box>
              )}

              {/* Video Editor */}
              {selectedFile.name?.toLowerCase().match(/\.(mp4|mov|avi|webm)$/) && (
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    Video Bearbeiten
                  </Typography>
                  <VideoEditor
                    videoUrl={`${BACKEND_URL}${selectedFile.file_url}`}
                    onSave={(edits) => {
                      console.log('Video edits:', edits);
                      setMessage({ type: 'success', text: 'Video-Änderungen gespeichert!' });
                    }}
                  />
                </Box>
              )}
              </Box>
              )}

              {/* Tab 2: Enhancement Settings */}
              {dialogTab === 2 && (
              <Box>
              {/* Enhancement Settings */}
              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Qualitäts-Verbesserung
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={enhanceSettings.removeNoise}
                        onChange={(e) => setEnhanceSettings({
                          ...enhanceSettings,
                          removeNoise: e.target.checked,
                        })}
                      />
                    }
                    label="Rauschunterdrückung"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={enhanceSettings.normalize}
                        onChange={(e) => setEnhanceSettings({
                          ...enhanceSettings,
                          normalize: e.target.checked,
                        })}
                      />
                    }
                    label="Audio Normalisierung"
                  />

                  <Box mt={3}>
                    <Typography gutterBottom>Kompression: {Math.round(enhanceSettings.compression * 100)}%</Typography>
                    <Slider
                      value={enhanceSettings.compression}
                      onChange={(e, val) => setEnhanceSettings({
                        ...enhanceSettings,
                        compression: val,
                      })}
                      min={0}
                      max={1}
                      step={0.01}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(val) => `${Math.round(val * 100)}%`}
                    />
                  </Box>

                  <Box mt={2}>
                    <Typography gutterBottom>Bass-Verstärkung: {enhanceSettings.bassBoost} dB</Typography>
                    <Slider
                      value={enhanceSettings.bassBoost}
                      onChange={(e, val) => setEnhanceSettings({
                        ...enhanceSettings,
                        bassBoost: val,
                      })}
                      min={-10}
                      max={10}
                      step={1}
                      valueLabelDisplay="auto"
                      marks
                    />
                  </Box>

                  <Box mt={2}>
                    <Typography gutterBottom>Höhen-Verstärkung: {enhanceSettings.trebleBoost} dB</Typography>
                    <Slider
                      value={enhanceSettings.trebleBoost}
                      onChange={(e, val) => setEnhanceSettings({
                        ...enhanceSettings,
                        trebleBoost: val,
                      })}
                      min={-10}
                      max={10}
                      step={1}
                      valueLabelDisplay="auto"
                      marks
                    />
                  </Box>

                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<EnhanceIcon />}
                    onClick={handleEnhance}
                    sx={{ mt: 3 }}
                    fullWidth
                    data-testid="apply-enhancement-button"
                  >
                    Qualität Verbessern
                  </Button>
                </CardContent>
              </Card>
              </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default MediaLibrary;
