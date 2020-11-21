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
import ObjectRenderer from './Renderer'
import { CarouselProvider, Slider, Slide,  Dot} from 'pure-react-carousel';
import './App.css';
import 'pure-react-carousel/dist/react-carousel.es.css';
var _ = require('lodash');


const socketAddress = (window.location.host === 'localhost:3000' && 'ws://localhost:8000')
  || window.location.origin.replace(/^http/, 'ws').replace("3000","8000");
const client = new W3CWebSocket(socketAddress);
console.log("connecting to: " + socketAddress + " connection: " + client);
function App({ width }) {
  const gameCodeInputEl = useRef(null);
  const maxCards = (/xs/.test(width) && 1)
    || (/sm/.test(width) && 2)
    || 5;
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [highlights, setHighlights] = useState({});
  const [cardData, setCardData] = useState({});
  const [colorData, setColorData] = useState([]);
  const [colorPointers, setColorPointers] = useState({});
  const [gameDecks, setGameDecks] = useState([]);
  const [gameCode, setGameCode] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [flipCards, setFlipCards] = useState(false);

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

  const movePointer = (position) => {
    client.send(JSON.stringify({
      type: "pointer",
      color: playerColor,
      guid: position,
      gameCode,
    }));
  };

  const highlightTemporarily = (guid) => {
    // console.log("Highlighted card: " + guid);

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
    // console.log("Play card: " + guid);
    client.send(JSON.stringify({
      type: "play",
      guid,
      gameCode,
      options:{flip:flipCards, color: playerColor},
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
          // console.log("CARD DATA");
          // console.log(payload);
          var unique = eliminateDuplicates(payload);
          setCardData(unique);
          break;
        case 'colors':
          setColorData(payload);
          break;
        case 'pointers':
          setColorPointers(payload);
          break;
        default:
          console.log("Received unknow data: " + data);
          break;
      }
    };
  }, []);


  const eliminateDuplicates = (cardDataDupes) => {
    var clone = JSON.parse(JSON.stringify(cardDataDupes));// Object.assign({}, cardDataDupes);
    var result = {};// Object.assign({}, cardDataDupes);
    // console.log("original :");
    // console.log(cardDataDupes);
    for (var color in clone){
      result[color] = [];
      clone[color].forEach(function(v){
        var duplicates = _.filter(clone[color], _.omit(v, 'guid'));
        var unique = _.omit(v, 'guid');
        unique.guid = [];
        duplicates.forEach(function (v) {unique.guid.push(v.guid)})
        result[color].push(unique);
      });
      result[color] = _.uniqWith(result[color], _.isEqual);

    }
    // console.log("result :");
    // console.log(result);
    return result;
  };

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
  const clickHandler = (event, card) => {
    var target = event.currentTarget;
    while (target.nodeName !== "LI" && target.nodeName !== "BODY"){
      target = target.parentNode;
    }
    let guid = Array.isArray(card.guid)? card.guid[0]: card.guid
    if (/highlight/.test(target.className)) {
      playCard(guid);
    } else {
      highlightTemporarily(guid);
    }
  };

  function PointerMap() {
    let colorPointers_u = {colors: Object.keys(colorPointers), pointers:colorPointers};
    const [pointerData, setPointerData] = useState(colorPointers_u);
    // setPointerData(pointers);
    // console.log("pointers");
    // console.log(colorPointers);
     return (<>
         <div
        style={{
          width: '200px',
          height: '200px',
          border: '1px solid',
          margin: '10px auto',
          borderRadius: '5px'
        }}
        onClick={(event) => {
          // console.log("Event");

          if(!colorPointers || !colorPointers[playerColor]){
            // console.log("Dismissed");
            // console.log(pointerData);
            return;
          }
          var rect = event.target.getBoundingClientRect();
          var x = event.clientX - rect.left; //x position within the element.
          var y = event.clientY - rect.top;  //y position within the element.
          colorPointers[playerColor].z  = (200 - y)/200;
          colorPointers[playerColor].x  = (x)/200;
          // console.log("x: " + x + " y: " + y);
          // console.log(colorPointers[playerColor]);
          let colorPointers_u = {colors: Object.keys(colorPointers), pointers:colorPointers};
          setPointerData(colorPointers_u);
          movePointer(colorPointers[playerColor]);
        }}
    >
      {
        pointerData.colors.map((color) => {
          const value = pointerData.pointers[color];
          return (<div key={color}
               style={{
                 backgroundColor: color,
                 position: 'relative',
                 width: '7px',
                 height: '7px',
                 top: 200 * (1 - value.z) + 'px',
                 left: 200 * value.x + 'px',
                 borderRadius: '7px'
               }}/>);
        })
      }
    </div>
       </>)
  }
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
          <MenuItem
              value={playerColor}
              key={0}
              disabled={true}
          >
          </MenuItem>
          {Object.keys(cardData).map(color => (
            <MenuItem
              value={color}
              key={color}
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
          {`There are ${cardData[playerColor].length} items in your hand`}
        </Typography>
        <Typography>
          Tap to highlight, tap again to play on table
        </Typography>
        <input
            style={{ marginTop: '10px' }}
            type="checkbox"
            id="flipbox"
            name="flipbox"
            value={flipCards}
            onChange={() => setFlipCards(!flipCards)}/>
        {/*(event) => setFlipCards(event.target.value)*/}
        <label htmlFor="flipbox"> Flip the card when played</label>
        {gameDecks.length > 0 && (
          <Box m={2}>
            <Button
              style={{ whiteSpace: 'nowrap' }}
              aria-controls="simple-menu"
              aria-haspopup="true"
              variant="contained"
              onClick={handleClick}
            >
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
                  <Box pr={1}>From {deck.name}</Box>
                  <img src={unescape(deck.back)} alt="card" className="deck_image" />
                </MenuItem>
              ))}
            </Menu>
          </Box>
        )}
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
          hasMasterSpinner
          naturalSlideWidth={256}
          naturalSlideHeight={358}
          totalSlides={cardData[playerColor].length}
          visibleSlides={Math.min(maxCards, cardData[playerColor].length)}
          highlights={highlights}
        >
          <Slider>
            {cardData[playerColor].map((card, index) => (
              <Slide
                key={Array.isArray(card.guid)? card.guid[0]: card.guid}
                index={index}
                className={highlights[Array.isArray(card.guid)? card.guid[0]: card.guid] ? 'highlight card' : 'card'}
                onClick={(event) => clickHandler(event, card)}
              >
                {Array.isArray(card.guid) && card.guid.length > 1 && (
                    <div className='counter'
                    >{card.guid.length}</div>
                )}
               <ObjectRenderer item={card}  onClick={(event) => clickHandler(event, card)} style={{backgroundColor: "rgb(55,55,55)", borderRadius: "25px"}}/>


              </Slide>
            ))}
          </Slider>
          <div
            style={{
              textAlign: 'center'
            }}
          >
            {cardData[playerColor].map((card, index) =>
              <Dot key={Array.isArray(card.guid)? card.guid[0]: card.guid} slide={index}>
                <ObjectRenderer item={card} style={{backgroundColor: "rgb(55,55,55)", borderRadius: "5px"}}/>
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
    {playerColor &&  colorPointers && (<PointerMap/>)}
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
