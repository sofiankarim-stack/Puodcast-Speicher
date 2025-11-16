import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Mic as MicIcon,
  Videocam as VideocamIcon,
  Stop as StopIcon,
  PlayArrow as PlayIcon,
  Save as SaveIcon,
  Replay as ReplayIcon,
} from '@mui/icons-material';
import { uploadMusic } from '../api';

function Recorder({ onRecordingComplete, type = 'both' }) {
  const [recording, setRecording] = useState(false);
  const [recordingType, setRecordingType] = useState('audio');
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [message, setMessage] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setMessage(null);
      chunksRef.current = [];
      setDuration(0);

      // Request media access
      const constraints = {
        audio: true,
        video: recordingType === 'video' ? { facingMode: 'user' } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Show video preview if recording video
      if (recordingType === 'video' && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Create MediaRecorder
      const mimeType = recordingType === 'video' 
        ? 'video/webm;codecs=vp8,opus'
        : 'audio/webm;codecs=opus';
      
      const recorder = new MediaRecorder(stream, { mimeType });
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: recordingType === 'video' ? 'video/webm' : 'audio/webm' 
        });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      recorder.start(100); // Collect data every 100ms
      setMediaRecorder(recorder);
      setRecording(true);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setMessage({ 
        type: 'error', 
        text: 'Fehler beim Starten der Aufnahme. Bitte erlauben Sie Mikrofon/Kamera-Zugriff.' 
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Clear video preview
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const handleSave = async () => {
    if (!recordedBlob) return;

    setUploading(true);
    setMessage({ type: 'info', text: 'Wird hochgeladen...' });

    try {
      // Create file from blob
      const filename = `recording-${Date.now()}.${recordingType === 'video' ? 'webm' : 'webm'}`;
      const file = new File([recordedBlob], filename, { 
        type: recordingType === 'video' ? 'video/webm' : 'audio/webm' 
      });

      // Upload file
      const response = await uploadMusic(file, 'recording');
      
      setMessage({ type: 'success', text: 'Aufnahme erfolgreich gespeichert!' });
      
      if (onRecordingComplete) {
        onRecordingComplete(response.data);
      }

      // Reset
      setTimeout(() => {
        setRecordedBlob(null);
        setRecordedUrl(null);
        setDuration(0);
      }, 2000);

    } catch (error) {
      console.error('Error saving recording:', error);
      setMessage({ type: 'error', text: 'Fehler beim Speichern der Aufnahme' });
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setDuration(0);
    setMessage(null);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card data-testid="recorder">
      <CardContent>
        <Typography variant="h5" gutterBottom>
          🎤 Aufnahme
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Nehmen Sie Audio oder Video direkt in der App auf
        </Typography>

        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {/* Recording Type Selection */}
        {!recording && !recordedBlob && (
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Aufnahme-Typ</InputLabel>
            <Select
              value={recordingType}
              label="Aufnahme-Typ"
              onChange={(e) => setRecordingType(e.target.value)}
              data-testid="recording-type-select"
            >
              <MenuItem value="audio">🎤 Nur Audio</MenuItem>
              <MenuItem value="video">🎥 Video mit Audio</MenuItem>
            </Select>
          </FormControl>
        )}

        {/* Video Preview */}
        {(recording || recordedBlob) && recordingType === 'video' && (
          <Box
            sx={{
              bgcolor: '#000',
              borderRadius: 2,
              overflow: 'hidden',
              mb: 2,
            }}
          >
            <video
              ref={videoRef}
              src={recordedUrl}
              controls={!!recordedUrl}
              style={{ width: '100%', maxHeight: '400px' }}
              data-testid="video-preview"
            />
          </Box>
        )}

        {/* Audio Preview */}
        {recordedUrl && recordingType === 'audio' && (
          <Box sx={{ mb: 2 }}>
            <audio
              src={recordedUrl}
              controls
              style={{ width: '100%' }}
              data-testid="audio-preview"
            />
          </Box>
        )}

        {/* Duration Display */}
        {(recording || recordedBlob) && (
          <Box display="flex" alignItems="center" justifyContent="center" gap={2} mb={2}>
            <Chip
              icon={recording ? <span style={{ fontSize: '1.5rem' }}>⏺</span> : <PlayIcon />}
              label={formatDuration(duration)}
              color={recording ? 'error' : 'default'}
              sx={{ fontSize: '1.2rem', py: 2 }}
            />
          </Box>
        )}

        {/* Control Buttons */}
        <Box display="flex" gap={2} justifyContent="center">
          {!recording && !recordedBlob && (
            <Button
              variant="contained"
              color="secondary"
              size="large"
              startIcon={recordingType === 'video' ? <VideocamIcon /> : <MicIcon />}
              onClick={startRecording}
              data-testid="start-recording-button"
            >
              Aufnahme starten
            </Button>
          )}

          {recording && (
            <Button
              variant="contained"
              color="error"
              size="large"
              startIcon={<StopIcon />}
              onClick={stopRecording}
              data-testid="stop-recording-button"
            >
              Stoppen
            </Button>
          )}

          {recordedBlob && (
            <>
              <Button
                variant="outlined"
                startIcon={<ReplayIcon />}
                onClick={handleReset}
                data-testid="reset-recording-button"
              >
                Neu aufnehmen
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={uploading}
                data-testid="save-recording-button"
              >
                {uploading ? 'Speichert...' : 'Speichern'}
              </Button>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default Recorder;
