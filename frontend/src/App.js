import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import EpisodeList from './components/EpisodeList';
import EpisodeEditor from './components/EpisodeEditor';
import './App.css';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/episodes" element={<EpisodeList />} />
          <Route path="/episodes/new" element={<EpisodeEditor />} />
          <Route path="/episodes/:id" element={<EpisodeEditor />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
