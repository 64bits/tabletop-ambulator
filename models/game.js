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

// 'use strict';
// module.exports = (sequelize, DataTypes) => {
//   const Game = sequelize.define('Game', {
//     gameCode: {
//       type: DataTypes.STRING,
//       primaryKey: true,
//       allowNull: false,
//     },
//     cards: {
//       type: DataTypes.JSON,
//     },
//     users: {
//       type: DataTypes.JSON,
//     },
//   }, {});
//   // Game.associate = function(models) {
//   //   // associations can be defined here
//   // };
//   const Mesh = sequelize.define('Mesh', {
//     meshURL: {
//       type: DataTypes.STRING,
//       primaryKey: true,
//       allowNull: false,
//     },
//     meshFilename: {
//       type: DataTypes.STRING,
//     }
//   }, {});
//   // Mesh.associate = function(models) {
//   //   // associations can be defined here
//   // };
//   return {Game, Mesh};
// };
//
