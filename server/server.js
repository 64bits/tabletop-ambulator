const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const sharp = require('sharp');
const bodyParser = require('body-parser');
const probe = require('probe-image-size');
const randomize = require('randomatic');
const app = express();
const webSocketServer = require('websocket').server;
let webSocketsServerPort = process.env.PORT;
if (webSocketsServerPort == null || webSocketsServerPort == "") {
  webSocketsServerPort = 8000;
}

// Initialize database
const { Game } = require('../models');

// Initialize id to ws connection list
const userConnections = {};

// Initialize highlight promises (handled in-memory)
const cardHighlightRes = {};

// Default card width and height
const CARD_WIDTH = 256;
const CARD_HEIGHT = 358;

// Spinning the http server and the websocket server.
const server = http.createServer(app);
const wsServer = new webSocketServer({
  httpServer: server
});

// Set up request parsing and static asset serving
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../build')));

// This code generates unique userid for every user
const getUniqueID = () => {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return s4() + s4() + '-' + s4();
};

// Update all players of a given game with cards
const updateClientCards = async (gameCode, givenCards) => {
  const activeGame = await Game.findByPk(gameCode);
  const { cards, users } = activeGame;
  if (givenCards !== undefined) {
    activeGame.cards = givenCards;
    await activeGame.save();
  }
  if (!users) return;
  users.forEach(userId => {
    if(userConnections[userId] === undefined) return;
    userConnections[userId].sendUTF(JSON.stringify(givenCards || cards || {}));
  });
};

// Set up websocket handling
wsServer.on('request',  (request) => {
  const userId = getUniqueID();
  const connection = request.accept(null, request.origin);
  console.log(`${new Date()} Received a new connection from origin ${request.origin}.`);

  connection.on('message', async (message) => {
    if (message.type !== 'utf8') return;
    const { type, gameCode, guid } = JSON.parse(message.utf8Data);
    const activeGame = gameCode ? await Game.findByPk(gameCode) : null;
    if (!activeGame) return;
    switch (type) {
      case 'join':
        userConnections[userId] = connection;
        activeGame.users = activeGame.users ? [ ...activeGame.users, userId ] : [ userId ];
        await activeGame.save();
        await updateClientCards(gameCode);
        console.log(`connected: ${userId} in ${gameCode}`);
        break;
      case 'highlight':
        cardHighlightRes[gameCode].json({ [guid]: true });
        delete cardHighlightRes[gameCode];
        break;
      default:
        break;
    }
  });

  connection.on('close', async (connection) => {
    console.log(`${new Date()} Peer ${userId} disconnected.`);
    delete userConnections[userId];
  });
});

// Serve React webapp
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// Handle serving processed card images
app.get('/card', (req, res) => {
  const imageUrl = req.query.url;
  const offset = req.query.offset;
  const sheetWidth = req.query.width;
  const sheetHeight = req.query.height;
  const thumbFactor = req.query.thumb ? 5 : 1;
  const left = (offset % sheetWidth) * CARD_WIDTH;
  const top = Math.floor(offset / sheetWidth) * CARD_HEIGHT;

  const protocol = imageUrl.startsWith('https') ? https : http;

  protocol.get(imageUrl, function(response) {
    const transformer = sharp()
      .resize({
        width: ~~(CARD_WIDTH * sheetWidth / thumbFactor),
        height: ~~(CARD_HEIGHT * sheetHeight / thumbFactor),
      })
      .extract({
        left: ~~(left / thumbFactor),
        top: ~~(top / thumbFactor),
        width: ~~(CARD_WIDTH / thumbFactor),
        height: ~~(CARD_HEIGHT / thumbFactor)
      });

    response.pipe(transformer).pipe(res);
  });
});

// Handle card information from game
app.post('/hands', async (req, res) => {
  const { code: gameCode } = req.query;
  const { payload } = req.body;
  if(!gameCode || !payload) res.sendStatus(400);
  await updateClientCards(gameCode, JSON.parse(payload));
  res.sendStatus(200);
});

// Handle long poll from the game client
app.get('/highlights', (req, res) => {
  const { code: gameCode } = req.query;
  if (!gameCode) res.sendStatus(400);
  cardHighlightRes[gameCode] = res;
});

// Handle creation of a new game
app.get('/create', async (req, res) => {
  let gameCode;
  // Try and make sure the code is unique
  do {
    gameCode = randomize('A', 4);
  } while((await Game.findByPk(gameCode)));
  await Game.create({ gameCode });
  return res.json({ code: gameCode });
});

// Start the server
server.listen(webSocketsServerPort);
