'use strict';
module.exports = (sequelize, DataTypes) => {
  const Game = sequelize.define('Game', {
    gameCode: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    cards: {
      type: DataTypes.JSON,
    },
    users: {
      type: DataTypes.JSON,
    },
  }, {});
  Game.associate = function(models) {
    // associations can be defined here
  };
  return Game;
};
