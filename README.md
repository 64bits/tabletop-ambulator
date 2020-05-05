## Tabletop Ambulator

### Overview
This web application makes it possible for owners of the game [Tabletop Simulator](https://store.steampowered.com/app/286160/Tabletop_Simulator/)
to play games involving a hidden hand of cards with their friends who may not own a copy of the game themselves. The web
app provides an interface to look at in-game hands and minimally interact with them. The host must manually co-ordinate
some parts of the game.

## Usage
Please refer to usage instructions in the [Steam workshop item](https://steamcommunity.com/sharedfiles/filedetails/?id=2085044664).

## Contribution
### Development
This is a NodeJS web app built on top of Express, React, and Websocket, with Postgres as the database.

The minimum requirements are NodeJs, Yarn, and Postgres. You will need to create a Postgres DB and store the connection
URI in the environment variable `DATABASE_URL`. The lua file has code mirroring what is in the Workshop item - for
development, replace the herokuapp URL with `http://localhost:8000` at the top.

Developers must use `yarn install` after cloning the repository to populate the required dependencies. Afterwards, run
`node server/server.js` to launch the server and `yarn start` to launch the React development server.

### Pull Requests
Pull Requests must target the `master` branch.
