const express = require('express');
const fs = require('fs');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const randomize = require('randomatic');
const DelayedResponse = require('http-delayed-response');
const app = express();
const webSocketServer = require('websocket').server;
const imageProcessor = require('./image-processor');
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
  Object.keys(users).forEach(userId => {
    if(userConnections[userId] === undefined) return;
    userConnections[userId].sendUTF(JSON.stringify({ type: 'cards', payload: givenCards || cards || {} }));
  });
};

// Update all players of a given game with colors
const updateClientColors = async (gameCode) => {
  const activeGame = await Game.findByPk(gameCode);
  const { users } = activeGame;
  if (!users) return;
  const payload = Object.values(users).filter(c => c != null) || [];
  Object.keys(users).forEach(userId => {
    if(userConnections[userId] === undefined) return;
    userConnections[userId].sendUTF(JSON.stringify({ type: 'colors', payload }));
  });
};

// Set up websocket handling
wsServer.on('request',  (request) => {
  let currentGame;
  const userId = getUniqueID();
  const connection = request.accept(null, request.origin);
  console.log(`${new Date()} Received a new connection from origin ${request.origin}.`);

  connection.on('message', async (message) => {
    if (message.type !== 'utf8') return;
    const { type, color, gameCode, guid } = JSON.parse(message.utf8Data);
    const activeGame = gameCode ? await Game.findByPk(gameCode) : null;
    if (!activeGame) return;
    switch (type) {
      case 'join':
        currentGame = gameCode;
        userConnections[userId] = connection;
        activeGame.users = { ...activeGame.users, [userId]: null };
        await activeGame.save();
        await updateClientCards(gameCode);
        await updateClientColors(gameCode);
        console.log(`connected: ${userId} in ${gameCode}`);
        break;
      case 'color':
        activeGame.users = { ...activeGame.users, [userId]: color };
        await activeGame.save();
        await updateClientColors(gameCode);
        break;
      case 'highlight':
        if(cardHighlightRes[gameCode] !== undefined) {
          cardHighlightRes[gameCode]({[guid]: 'highlight'});
          delete cardHighlightRes[gameCode];
        }
        break;
      case 'play':
        if(cardHighlightRes[gameCode] !== undefined) {
          cardHighlightRes[gameCode]({[guid]: 'play'});
          delete cardHighlightRes[gameCode];
        }
        break;
      default:
        break;
    }
  });

  connection.on('close', async (connection) => {
    console.log(`${new Date()} Peer ${userId} disconnected.`);
    delete userConnections[userId];
    if (currentGame) {
      const activeGame = await Game.findByPk(currentGame);
      activeGame.users = { ...activeGame.users, [userId]: null };
      await activeGame.save();
      await updateClientColors(currentGame);
    }
  });
});

// Serve React webapp
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// Handle serving processed card images
app.get('/card', (req, res) => {
  imageProcessor(req, res);
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
  if (!gameCode) {
    res.sendStatus(400);
    return;
  }
  const delayed = new DelayedResponse(req, res);
  delayed.json();
  delayed.on('done', function (data) {
    res.write(JSON.stringify(data));
    res.end();
  });
  delayed.on('error', function (err) {
    res.write(JSON.stringify(err));
    res.end();
  });
  delayed.on('abort', function (err) {
    res.end();
  });
  cardHighlightRes[gameCode] = delayed.start(10000);
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

// Serve the object JSON that is used to construct the ambulator
app.get('/ambulator', async (req, res) => {
  fs.readFile(path.join(__dirname, '../build/ambulator.json'), 'utf8', function(err, contents) {
    if (err) {
      res.sendStatus(500);
      return;
    }
    const json = JSON.parse(contents);
    fs.readFile(path.join(__dirname, '../build/ambulator.lua'), 'utf8', function(err, contents) {
      if (err) {
        res.sendStatus(500);
        return;
      }
      const prefix = req.headers.host.startsWith('localhost') ? 'http' : 'https';
      json.LuaScript = contents.replace('$HOSTNAME', `${prefix}://${req.headers.host}`);
      res.json(json);
    });
  });
});

// Start the server
server.listen(webSocketsServerPort);
