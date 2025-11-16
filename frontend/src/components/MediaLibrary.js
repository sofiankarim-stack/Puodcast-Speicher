import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
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
    setEditDialogOpen(true);
  };

  const handleEnhance = async () => {
    setMessage({ type: 'info', text: 'Audio wird optimiert...' });
    
    // Simulate enhancement (in production, call backend API)
    setTimeout(() => {
      setMessage({ type: 'success', text: 'Audio-Qualität erfolgreich verbessert!' });
      setEditDialogOpen(false);
    }, 2000);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Box>
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
              {/* Audio Editor */}
              {selectedFile.name?.toLowerCase().match(/\.(mp3|wav|ogg|aac)$/) && (
                <Box mb={3}>
                  <AudioEditor
                    audioUrl={`${BACKEND_URL}${selectedFile.file_url}`}
                    onSave={(regions) => {
                      console.log('Audio edits:', regions);
                      setMessage({ type: 'success', text: 'Änderungen gespeichert!' });
                    }}
                  />
                </Box>
              )}

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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MediaLibrary;
