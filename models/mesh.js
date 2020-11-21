'use strict';
module.exports = (sequelize, DataTypes) => {
  const Mesh = sequelize.define('Mesh', {
    meshURL: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,},
    meshFilename: DataTypes.STRING

  }, {});
  Mesh.associate = function(models) {
    // associations can be defined here
  };
  return Mesh;
};