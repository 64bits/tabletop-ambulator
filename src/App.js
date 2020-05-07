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
  Menu,
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
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [highlights, setHighlights] = useState({});
  const [cardData, setCardData] = useState({});
  const [colorData, setColorData] = useState([]);
  const [gameDecks, setGameDecks] = useState([]);
  const [gameCode, setGameCode] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);

  const joinGame = (code) => {
    client.send(JSON.stringify({
      type: "join",
      gameCode: code,
    }));
    setGameCode(code);
  };

  const selectColor = (color) => {
    client.send(JSON.stringify({
      type: "color",
      color,
      gameCode,
    }));
    setPlayerColor(color);
  };

  const drawCard = (guid) => {
    client.send(JSON.stringify({
      type: "draw",
      color: playerColor,
      guid,
      gameCode,
    }));
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
    client.onmessage = ({ data }) => {
      const { type, payload } = JSON.parse(data);
      switch (type) {
        case 'decks':
          setGameDecks(payload);
          break;
        case 'cards':
          setCardData(payload);
          break;
        case 'colors':
          setColorData(payload);
          break;
        default:
          break;
      }
    };
  }, []);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

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
          onChange={(e) => selectColor(e.target.value)}
        >
          {Object.keys(cardData).map(color => (
            <MenuItem
              value={color}
              disabled={colorData.indexOf(color) >= 0}
            >
              <Brightness1Icon style={{ color }} />
              <Box pl={1}>{color}</Box>
            </MenuItem>
          ))}
        </Select>
      </>
    )}
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
          {gameDecks.length < 0 && (
            <Box m={2}>
              <Button style={{ whiteSpace: 'nowrap' }} aria-controls="simple-menu" aria-haspopup="true" onClick={handleClick}>
                Draw Card
              </Button>
              <Menu
                id="simple-menu"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                {gameDecks.map(deck => (
                  <MenuItem
                    onClick={() => { drawCard(deck.guid); handleClose(); }}
                    value={deck.guid}
                  >
                    <Box pr={1}>From</Box>
                    <img src={unescape(deck.back)} width={45} height={60} />
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          )}
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
    {playerColor && (
      <Button
        variant="contained"
        color="primary"
        onClick={() => selectColor(null)}
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
