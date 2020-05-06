import React, { useRef, useEffect, useState } from 'react';
import { w3cwebsocket as W3CWebSocket } from 'websocket';
import {
  Box,
  Paper,
  InputBase,
  Container,
  Button,
  IconButton,
  Select,
  MenuItem,
  Typography,
  withWidth
} from '@material-ui/core';
import Brightness1Icon from '@material-ui/icons/Brightness1';
import DoubleArrowIcon from '@material-ui/icons/DoubleArrow';
import { CarouselProvider, Slider, Slide, Image, Dot, ButtonBack, ButtonNext } from 'pure-react-carousel';
import './App.css';
import 'pure-react-carousel/dist/react-carousel.es.css';

const socketAddress = (window.location.host === 'localhost:3000' && 'ws://localhost:8000')
  || window.location.origin.replace(/^http/, 'ws');
const client = new W3CWebSocket(socketAddress);

function App({ width }) {
  const gameCodeInputEl = useRef(null);
  const maxCards = (/xs/.test(width) && 1)
    || (/sm/.test(width) && 2)
    || 5;
  const [highlights, setHighlights] = useState({});
  const [cardData, setCardData] = useState({});
  const [gameCode, setGameCode] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);

  const joinGame = (code) => {
    client.send(JSON.stringify({
      type: "join",
      gameCode: code,
    }));
    setGameCode(code);
  };

  const highlightTemporarily = (guid) => {
    const oldTimeout = highlights[guid] || null;
    clearTimeout(oldTimeout);
    client.send(JSON.stringify({
      type: "highlight",
      guid,
      gameCode,
    }));
    setHighlights({
      ...highlights,
      [guid]: setTimeout(() => {
        setHighlights(Object.keys(highlights)
          .filter(key => key === guid)
          .reduce((obj, key) => {
            obj[key] = highlights[key];
            return obj;
          }, {}));
      }, 10000),
    });
  };

  const playCard = (guid) => {
    client.send(JSON.stringify({
      type: "play",
      guid,
      gameCode,
    }));
  };

  useEffect(() => {
    client.onopen = () => {
      console.log('WebSocket Client Connected');
    };
    client.onmessage = (message) => {
      const data = JSON.parse(message.data);
      setCardData(data);
    };
  }, []);

  const selectGame = () => (
    <>
      <Box my={3}>
        <Paper elevation={1} style={{ display: 'flex', alignItems: 'center', width: '300px', margin: '0 auto' }}>
          <InputBase defaultValue="" inputRef={gameCodeInputEl} style={{ marginLeft: '10px', flex: '1' }} placeholder="Enter Room Code (4 letter)" />
          <IconButton
            onClick={() => joinGame(gameCodeInputEl.current.value.toUpperCase())}
            style={{ padding: '10px' }}
            aria-label="Begin"
          >
            <DoubleArrowIcon />
          </IconButton>
        </Paper>
      </Box>
    </>
  );

  const gameContent = () => (
    <>
    {cardData[playerColor] && (
      <Box my={3}>
        <Typography>
          {`There are ${cardData[playerColor].length} cards in your hand`}
        </Typography>
        <Typography>
          Tap to highlight, tap again to play on table
        </Typography>
      </Box>
    )}
    {cardData[playerColor] && (
      <div
        style={{
          margin: '0 auto',
          maxWidth: 256 * Math.min(maxCards, cardData[playerColor].length)
        }}
      >
        <CarouselProvider
          naturalSlideWidth={256}
          naturalSlideHeight={358}
          totalSlides={cardData[playerColor].length}
          visibleSlides={Math.min(maxCards, cardData[playerColor].length)}
          highlights={highlights}
        >
          <Slider>
            {cardData[playerColor].map((card, index) => (
              <Slide
                key={card.guid}
                index={index}
                className={highlights[card.guid] ? 'highlight card' : 'card'}
                onClick={(event) => {
                  if (/highlight/.test(event.currentTarget.className)) {
                    playCard(card.guid);
                  } else {
                    highlightTemporarily(card.guid);
                  }
                }}
              >
                <Image
                  src={
                  `/card?url=${encodeURI(card.face)}&offset=${card.offset}&width=${card.width}&height=${card.height}`
                  }
                  hasMasterSpinner={true}
                />
              </Slide>
            ))}
          </Slider>
          <div
            style={{
              textAlign: 'center'
            }}
          >
            {cardData[playerColor].map((card, index) =>
              <Dot key={card.guid} slide={index}>
                <img
                  alt=""
                  src={
                    `/card?url=${encodeURI(card.face)}&offset=${card.offset}&width=${card.width}&height=${card.height}&thumb=true`
                  }
                />
              </Dot>
            )}
          </div>
        </CarouselProvider>
      </div>
    )}
    {!playerColor && (
      <>
        <Box my={5}>
          <Typography>
            Choose Player Color
          </Typography>
        </Box>
        <Select
          style={{ minWidth: 150 }}
          value={playerColor}
          onChange={(e) => setPlayerColor(e.target.value)}
        >
        {Object.keys(cardData).map(color => (
          <MenuItem value={color}>
            <Brightness1Icon style={{ color }} />
            <Box pl={1}>{color}</Box>
          </MenuItem>
        ))}
        </Select>
      </>
    )}
    {playerColor && (
      <Button
        variant="contained"
        color="primary"
        onClick={() => setPlayerColor(null)}
        style={{
          marginTop: '20px'
        }}
      >
        Playing as {playerColor} - click to change
      </Button>
    )}
    </>
  );

  return (
    <Container className="App">
      {!gameCode && selectGame()}
      {gameCode && gameContent()}
    </Container>
  );
}

export default withWidth()(App);
