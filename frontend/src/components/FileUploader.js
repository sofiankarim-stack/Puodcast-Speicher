import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  AudioFile as AudioIcon,
  VideoFile as VideoIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { uploadMusic } from '../api';

function FileUploader({ onFileUploaded, acceptedTypes = ['audio', 'video', 'image'], category = 'background' }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const getAcceptString = () => {
    const types = [];
    if (acceptedTypes.includes('audio')) types.push('audio/*');
    if (acceptedTypes.includes('video')) types.push('video/*');
    if (acceptedTypes.includes('image')) types.push('image/*');
    return types.join(',');
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('audio')) return <AudioIcon />;
    if (fileType.startsWith('video')) return <VideoIcon />;
    if (fileType.startsWith('image')) return <ImageIcon />;
    return <AudioIcon />;
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setMessage(null);

    try {
      for (const file of files) {
        const response = await uploadMusic(file, category);
        
        const uploadedFile = {
          id: response.data.id,
          name: file.name,
          type: file.type,
          size: file.size,
          url: response.data.file_url,
        };

        setUploadedFiles(prev => [...prev, uploadedFile]);
        
        if (onFileUploaded) {
          onFileUploaded(uploadedFile);
        }
      }

      setMessage({
        type: 'success',
        text: `${files.length} Datei(en) erfolgreich hochgeladen!`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({
        type: 'error',
        text: 'Fehler beim Hochladen der Datei(en)',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Card data-testid="file-uploader">
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Dateien Hochladen
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Unterstützt: {acceptedTypes.join(', ').toUpperCase()}
        </Typography>

        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {uploading && <LinearProgress sx={{ mb: 2 }} />}

        <Box mb={3}>
          <input
            accept={getAcceptString()}
            style={{ display: 'none' }}
            id="file-upload-input"
            type="file"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <label htmlFor="file-upload-input">
            <Button
              variant="contained"
              color="secondary"
              component="span"
              startIcon={<UploadIcon />}
              disabled={uploading}
              fullWidth
              data-testid="upload-button"
            >
              {uploading ? 'Wird hochgeladen...' : 'Dateien Auswählen'}
            </Button>
          </label>
        </Box>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Hochgeladene Dateien:
            </Typography>
            <List>
              {uploadedFiles.map((file) => (
                <ListItem
                  key={file.id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveFile(file.id)}
                      data-testid={`delete-file-${file.id}`}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <Box display="flex" alignItems="center" gap={2} width="100%">
                    {getFileIcon(file.type)}
                    <Box flexGrow={1}>
                      <ListItemText
                        primary={file.name}
                        secondary={formatFileSize(file.size)}
                      />
                    </Box>
                    <Chip
                      label={file.type.split('/')[0]}
                      size="small"
                      color="primary"
                    />
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default FileUploader;
