import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, TextField, Button, Container, Alert, Box } from '@mui/material';
import EvalBar from './evalbar';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { Chess } from 'chess.js';
import css from "./App.css";

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: 'transparent',
    },
    primary: {
      main: '#1a73e8',
    },
    secondary: {
      main: '#e91e63',
    },
  },
});

function App() {
  const [links, setLinks] = useState([
    {
      broadcastID: '',
      evaluation: null,
      whitePlayer: 'White',
      blackPlayer: 'Black',
      error: null,
      lastFEN: '', // Store the last FEN here
    },
  ]);

  const fetchEvaluation = async (fen) => {
    const endpoint = `http://127.0.0.1:5000/evaluate?fen=${encodeURIComponent(fen)}`;
    const response = await fetch(endpoint, { method: 'GET', mode: 'cors' });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  };

  const fetchPgn = async (index) => {
    const link = links[index];
    const baseURL = 'https://lichess.org/study/';
    const broadcastID = link.broadcastID.match(/[a-zA-Z0-9]{8}\/[a-zA-Z0-9]{8}$/)[0];
    const pgnLink = `${baseURL}${broadcastID}.pgn`;
    const response = await fetch(pgnLink);
    const text = await response.text();

    const whiteNameMatch = text.match(/\[White "(.*?)"\]/);
    const blackNameMatch = text.match(/\[Black "(.*?)"\]/);
    const whitePlayer = whiteNameMatch ? whiteNameMatch[1] : 'Unknown';
    const blackPlayer = blackNameMatch ? blackNameMatch[1] : 'Unknown';

    const moveString = text
      .split('\n')
      .filter((line) => !line.startsWith('['))
      .join(' ')
      .replace(/ {.*?}/g, '')
      .trim();
    const chess = new Chess();
    chess.loadPgn(moveString);

    const newFEN = chess.fen();
    if (newFEN !== link.lastFEN) {
      try {
        const evalData = await fetchEvaluation(newFEN);
        const updatedLinks = [...links];
        updatedLinks[index] = {
          ...link,
          evaluation: evalData.evaluation,
          whitePlayer,
          blackPlayer,
          lastFEN: newFEN,
        };
        setLinks(updatedLinks);
      } catch (e) {
        const updatedLinks = [...links];
        updatedLinks[index] = {
          ...link,
          error: e.message,
          lastFEN: newFEN,
        };
        setLinks(updatedLinks);
      }
    }
  };

  const fetchAllPgn = async () => {
    for (let index = 0; index < links.length; index++) {
      if (links[index].broadcastID.trim() !== '') {
        await fetchPgn(index);
      }
    }
  };

  useEffect(() => {
    const fetchInterval = setInterval(fetchAllPgn, 30000);
    return () => clearInterval(fetchInterval);
  }, [links]);

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="md">
        <AppBar position="static" color="default">
          <Toolbar>
            <img src="/cbi_logo.png" alt="ChessBase India Logo" style={{ height: '50px', marginRight: '20px' }}/>
            <Typography variant="h5" flexGrow={1} align="center">Chessbase India Evaluation Bars</Typography>
          </Toolbar>
        </AppBar>
        <Box mt={4} px={3}> 
          {links.map((link, index) => (
            <Box key={index} my={3}>
              <TextField 
                fullWidth 
                variant="outlined" 
                label="Broadcast ID" 
                value={link.broadcastID} 
                onChange={(e) => {
                  const updatedLinks = [...links];
                  updatedLinks[index].broadcastID = e.target.value;
                  setLinks(updatedLinks);
                }}
              />
              <Button 
                variant="contained" 
                color="primary" 
                style={{ marginTop: '10px' }} 
                onClick={() => fetchPgn(index)}
              >
                Fetch Evaluation
              </Button>
              {link.error && <Alert severity="error" style={{ marginTop: '10px' }}>{link.error}</Alert>}
            </Box>
          ))}
          <Button variant="contained" color="secondary" style={{ marginTop: '10px' }} onClick={() => setLinks([...links, { broadcastID: '', evaluation: null, whitePlayer: 'White', blackPlayer: 'Black', error: null, lastFEN: '' }])}>
            Add Another Link
          </Button>
        </Box>
        <Box mt={4} px={3} display="flex" flexWrap="wrap" justifyContent="space-between">
          {links.map((link, index) => (
            <EvalBar 
              key={index} 
              evaluation={link.evaluation} 
              whitePlayer={link.whitePlayer} 
              blackPlayer={link.blackPlayer} 
            />
          ))}
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;

