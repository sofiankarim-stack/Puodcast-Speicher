import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Slider,
  Grid,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  VolumeUp as VolumeIcon,
  ContentCut as CutIcon,
  Undo as UndoIcon,
} from '@mui/icons-material';
import WaveSurfer from 'wavesurfer.js';

function AudioEditor({ audioUrl, onSave }) {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [regions, setRegions] = useState([]);

  useEffect(() => {
    if (waveformRef.current && audioUrl) {
      // Initialize WaveSurfer
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#FF6B35',
        progressColor: '#003DA5',
        cursorColor: '#FFFFFF',
        barWidth: 3,
        barRadius: 3,
        cursorWidth: 2,
        height: 100,
        barGap: 2,
      });

      wavesurfer.current.load(audioUrl);

      wavesurfer.current.on('ready', () => {
        setDuration(wavesurfer.current.getDuration());
      });

      wavesurfer.current.on('audioprocess', () => {
        setCurrentTime(wavesurfer.current.getCurrentTime());
      });

      wavesurfer.current.on('play', () => setPlaying(true));
      wavesurfer.current.on('pause', () => setPlaying(false));

      return () => {
        if (wavesurfer.current) {
          wavesurfer.current.destroy();
        }
      };
    }
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
    }
  };

  const handleStop = () => {
    if (wavesurfer.current) {
      wavesurfer.current.stop();
      setPlaying(false);
    }
  };

  const handleVolumeChange = (event, newValue) => {
    setVolume(newValue);
    if (wavesurfer.current) {
      wavesurfer.current.setVolume(newValue);
    }
  };

  const handleTrim = () => {
    // Get current region selection
    const start = wavesurfer.current.getCurrentTime();
    const end = start + 5; // Trim 5 seconds as example
    
    setRegions([...regions, { start, end }]);
    alert(`Bereich markiert: ${start.toFixed(2)}s - ${end.toFixed(2)}s`);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card data-testid="audio-editor">
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Audio Editor
        </Typography>

        {/* Waveform Display */}
        <Box sx={{ my: 3, bgcolor: '#1E1E1E', p: 2, borderRadius: 2 }}>
          <div ref={waveformRef} />
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
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <IconButton
              color="primary"
              onClick={handlePlayPause}
              size="large"
              data-testid="play-pause-button"
            >
              {playing ? <PauseIcon fontSize="large" /> : <PlayIcon fontSize="large" />}
            </IconButton>
          </Grid>
          <Grid item>
            <IconButton color="secondary" onClick={handleStop} data-testid="stop-button">
              <StopIcon />
            </IconButton>
          </Grid>
          <Grid item>
            <IconButton color="secondary" onClick={handleTrim} title="Bereich markieren" data-testid="trim-button">
              <CutIcon />
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
                data-testid="volume-slider"
              />
            </Box>
          </Grid>
        </Grid>

        {/* Marked Regions */}
        {regions.length > 0 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Markierte Bereiche zum Schneiden:
            </Typography>
            {regions.map((region, index) => (
              <Box key={index} display="flex" alignItems="center" gap={2} mb={1}>
                <Typography variant="body2">
                  {formatTime(region.start)} - {formatTime(region.end)}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setRegions(regions.filter((_, i) => i !== index))}
                >
                  <UndoIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {/* Save Button */}
        {onSave && (
          <Box mt={3}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => onSave(regions)}
              data-testid="save-edits-button"
            >
              Änderungen Speichern
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default AudioEditor;
