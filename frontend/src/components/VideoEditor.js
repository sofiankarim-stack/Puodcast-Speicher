import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Slider,
  Grid,
  TextField,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  VolumeUp as VolumeIcon,
  ContentCut as CutIcon,
  FastForward as FastForwardIcon,
  FastRewind as FastRewindIcon,
} from '@mui/icons-material';

function VideoEditor({ videoUrl, onSave }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [voiceVolume, setVoiceVolume] = useState(1.0);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const handleVolumeChange = (event, newValue) => {
    setVolume(newValue);
    if (videoRef.current) {
      videoRef.current.volume = newValue;
    }
  };

  const handleSeek = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const handleSetTrimStart = () => {
    if (videoRef.current) {
      setTrimStart(videoRef.current.currentTime);
    }
  };

  const handleSetTrimEnd = () => {
    if (videoRef.current) {
      setTrimEnd(videoRef.current.currentTime);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setTrimEnd(videoRef.current.duration);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card data-testid="video-editor">
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Video Editor
        </Typography>

        {/* Video Display */}
        <Box sx={{ my: 3, bgcolor: '#000', borderRadius: 2, overflow: 'hidden' }}>
          <video
            ref={videoRef}
            src={videoUrl}
            style={{ width: '100%', maxHeight: '400px' }}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            data-testid="video-player"
          />
        </Box>

        {/* Time Display */}
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Typography variant="body2" color="text.secondary">
            {formatTime(currentTime)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatTime(duration)}
          </Typography>
        </Box>

        {/* Controls */}
        <Grid container spacing={2} alignItems="center" mb={3}>
          <Grid item>
            <IconButton onClick={() => handleSeek(-5)} color="secondary">
              <FastRewindIcon />
            </IconButton>
          </Grid>
          <Grid item>
            <IconButton
              color="primary"
              onClick={handlePlayPause}
              size="large"
              data-testid="video-play-pause"
            >
              {playing ? <PauseIcon fontSize="large" /> : <PlayIcon fontSize="large" />}
            </IconButton>
          </Grid>
          <Grid item>
            <IconButton onClick={() => handleSeek(5)} color="secondary">
              <FastForwardIcon />
            </IconButton>
          </Grid>
          <Grid item xs>
            <Box display="flex" alignItems="center" gap={2}>
              <VolumeIcon />
              <Slider
                value={volume}
                onChange={handleVolumeChange}
                min={0}
                max={1}
                step={0.01}
                sx={{ flexGrow: 1 }}
                data-testid="video-volume-slider"
              />
            </Box>
          </Grid>
        </Grid>

        {/* Trim Controls */}
        <Card sx={{ bgcolor: 'background.default', p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Video Schneiden
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={5}>
              <TextField
                label="Start-Zeit"
                value={formatTime(trimStart)}
                InputProps={{ readOnly: true }}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                variant="outlined"
                onClick={handleSetTrimStart}
                fullWidth
                data-testid="set-trim-start"
              >
                Start setzen
              </Button>
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                label="End-Zeit"
                value={formatTime(trimEnd)}
                InputProps={{ readOnly: true }}
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>

          <Button
            variant="outlined"
            onClick={handleSetTrimEnd}
            fullWidth
            sx={{ mt: 2 }}
            data-testid="set-trim-end"
          >
            Ende setzen
          </Button>

          {/* Manual Time Input */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={6}>
              <TextField
                label="Start (Sekunden)"
                type="number"
                value={trimStart}
                onChange={(e) => setTrimStart(Math.max(0, parseFloat(e.target.value) || 0))}
                fullWidth
                size="small"
                inputProps={{ step: 0.1, min: 0, max: duration }}
                data-testid="manual-trim-start"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Ende (Sekunden)"
                type="number"
                value={trimEnd}
                onChange={(e) => setTrimEnd(Math.max(0, parseFloat(e.target.value) || 0))}
                fullWidth
                size="small"
                inputProps={{ step: 0.1, min: 0, max: duration }}
                data-testid="manual-trim-end"
              />
            </Grid>
          </Grid>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Ausgewählte Dauer: {formatTime(Math.max(0, trimEnd - trimStart))}
          </Typography>
        </Card>

        {/* Audio Mixing Controls */}
        <Card sx={{ bgcolor: 'background.default', p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Audio-Mixing
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Passen Sie die Lautstärke von Musik und Stimme separat an
          </Typography>
          
          <Box mt={2}>
            <Typography gutterBottom>🎵 Musik-Lautstärke: {Math.round(musicVolume * 100)}%</Typography>
            <Slider
              value={musicVolume}
              onChange={(e, val) => setMusicVolume(val)}
              min={0}
              max={1}
              step={0.01}
              valueLabelDisplay="auto"
              valueLabelFormat={(val) => `${Math.round(val * 100)}%`}
              data-testid="music-volume-slider"
            />
          </Box>

          <Box mt={2}>
            <Typography gutterBottom>🎤 Stimmen-Lautstärke: {Math.round(voiceVolume * 100)}%</Typography>
            <Slider
              value={voiceVolume}
              onChange={(e, val) => setVoiceVolume(val)}
              min={0}
              max={2}
              step={0.01}
              valueLabelDisplay="auto"
              valueLabelFormat={(val) => `${Math.round(val * 100)}%`}
              data-testid="voice-volume-slider"
            />
          </Box>
        </Card>

        {/* Save Button */}
        {onSave && (
          <Box mt={3}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => onSave({ 
                trimStart, 
                trimEnd, 
                volume,
                musicVolume,
                voiceVolume 
              })}
              data-testid="save-video-edits"
              fullWidth
            >
              Video Änderungen Speichern
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default VideoEditor;
