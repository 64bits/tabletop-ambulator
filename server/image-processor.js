const request = require('request');
const cachedRequest = require('cached-request')(request);
const sharp = require('sharp');
// const http = require('http');
const randomize = require('randomatic');
const fs = require('fs');


cachedRequest.setCacheDirectory('/tmp/cache');

const IMAGE_MAX_MB = 5;

const models = require('../models');
// console.log("Models");
// console.log(models);
const Mesh = models['Mesh'];


const imageProcessor = (req, res) => {
  const { url: imageUrl, offset, width: sheetWidth, height: sheetHeight, thumb } = req.query;
  if(!imageUrl || !offset || !sheetWidth || !sheetHeight) {
    res.sendStatus(400);
    return;
  }
  const thumbFactor = thumb ? 5 : 1;
  const remoteImageUrl = unescape(imageUrl);
  request({
    url: remoteImageUrl,
    method: 'HEAD'
  }, function(err, response, body) {
    if (!response.headers['content-length'] || response.headers['content-length'] / (1024 * 1024) > IMAGE_MAX_MB) {
      res.redirect('https://i.imgur.com/kPXLU8G.jpg');
      return;
    }
    // Proceed if image is small enough
    cachedRequest.get({
      url: remoteImageUrl,
      encoding: null,
      ttl: 30 * 60 * 1000 // 30 minutes
    }, function (err, response, body) {
      const image = sharp(body);
      image
        .metadata()
        .then(({ width, height, format }) => {
          // Calculate card size based on the sheet info and image dims
          const cardWidth = ~~(width / sheetWidth);
          const cardHeight = ~~(height / sheetHeight);
          const left = (offset % sheetWidth) * cardWidth;
          const top = Math.floor(offset / sheetWidth) * cardHeight;
          image
            .resize({
              width: ~~(width / thumbFactor),
              height: ~~(height / thumbFactor),
            })
            .extract({
              left: ~~(left / thumbFactor),
              top: ~~(top / thumbFactor),
              width: ~~(cardWidth / thumbFactor),
              height: ~~(cardHeight / thumbFactor)
            })
            .toBuffer()
            .then(data => {
              res.type(format);
              res.end(data);
            })
            .catch(err => {
              console.log(err);
              res.redirect('https://i.imgur.com/WwuvEPd.jpg');
            });
        })
        .catch(err => {
          console.log(err);
          res.redirect('https://i.imgur.com/WwuvEPd.jpg');
        });
    });
  });
};
const textureProcessor = (req, res) => {
  // const { url: imageUrl, offset, width: sheetWidth, height: sheetHeight, thumb } = req.query;
  const { url: textureURL } = req.query;

  if(!textureURL) {
    res.sendStatus(400);
    return;
  }
  const remoteTextureURL = unescape(textureURL);
  request({
    url: remoteTextureURL,
    method: 'HEAD'
  }, function(err, response, body) {
    if (!response.headers['content-length'] || response.headers['content-length'] / (1024 * 1024) > IMAGE_MAX_MB) {
      res.redirect('https://i.imgur.com/kPXLU8G.jpg');
      return;
    }
    // Proceed if image is small enough
    cachedRequest.get({
      url: remoteTextureURL,
      encoding: null,
      ttl: 30 * 60 * 1000 // 30 minutes
    }, function (err, response, body) {
      const image = sharp(body);
      image.metadata()
          .then(({ width, height, format }) => {
          image.
            toBuffer()
                .then(data => {
                  res.type(format);
                  res.end(data);
                })
                .catch(err => {
                  console.log(err);
                  res.redirect('https://i.imgur.com/WwuvEPd.jpg');
                });
          }) .catch(err => {
        console.log(err);
        res.redirect('https://i.imgur.com/WwuvEPd.jpg');
      });

    });
  });
};



const download = (url, dest, cb) => {
  const file = fs.createWriteStream(dest);
  const sendReq = request.get(url);

  // verify response code
  sendReq.on('response', (response) => {
    if (response.statusCode !== 200) {
      console.log("got errors 1");
      return cb('Response status was ' + response.statusCode);
    }

    sendReq.pipe(file);
  });

  // close() is async, call cb after close completes
  console.log("seems working")
  file.on('finish', () => file.close(cb));

  // check for request errors
  sendReq.on('error', (err) => {
    console.log("got errors 2");

    fs.unlink(dest);
    return cb(err.message);
  });

  file.on('error', (err) => { // Handle errors
    console.log("got errors 3");
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    return cb(err.message);
  });
};

const meshProcessor =async (req, res) =>{
  const { url: meshURL } = req.query;
  if(!meshURL) {
    res.sendStatus(400);
    return;
  }
  const remoteMeshUrl = unescape(meshURL);

  const cachedMesh = await Mesh.findByPk(meshURL);

  if (cachedMesh){
    console.log("chached mesh ");
    // console.log(cachedMesh);
  }else{
    console.log("create mesh cache for url: " + meshURL);
    const cachedMesh = await Mesh.create({ meshURL });
    let resourceCode  = randomize('A', 10);
    const cb = async (answer) => {
      if(answer){
        console.log("callback " + answer)
      }else{
        console.log("successfully downloaded " +meshURL + " in " + resourceCode);
        cachedMesh.meshFilename = resourceCode;
        await cachedMesh.save();
      }
    };
    console.log("downloading mesh cache url: " + meshURL + " and filename" + resourceCode);
    const gg =  await download(remoteMeshUrl,"./resources/" + resourceCode + ".obj",cb);
    console.log("finished downloading : " + gg)
  }
  let localMeshUrl;
  if(!cachedMesh || !cachedMesh.meshFilename){
    console.log("error: file has not been downloaded yet")
    localMeshUrl =  "./resources/waitdownload.obj";
  }else{
    localMeshUrl = "./resources/" + cachedMesh.meshFilename + ".obj";

  }
  fs.readFile(localMeshUrl, function (err,data) {
    if (err) {
      console.log("error loading file: " + localMeshUrl);
      res.writeHead(404);
      res.end(JSON.stringify(err));
      return;
    }
    console.log("successfully loaded file: " + localMeshUrl);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(data);
  })
};
// const materialProcessor =async (req, res) =>{
//   const { url: materialURL } = req.query;
//   if(!materialURL) {
//     res.sendStatus(400);
//     return;
//   }
//   const remoteMeshUrl = unescape(materialURL);
//
//   const cachedMesh = await Mesh.findByPk(materialURL);
//
//   if (cachedMesh){
//     console.log("chached mesh ");
//     // console.log(cachedMesh);
//   }else{
//     console.log("create mesh cache for url: " + materialURL);
//     const cachedMesh = await Mesh.create({ meshURL: materialURL });
//     let resourceCode  = randomize('A', 10);
//     const cb = async (answer) => {
//       if(answer){
//         console.log("callback " + answer)
//       }else{
//         console.log("successfully downloaded " +materialURL + " in " + resourceCode);
//         cachedMesh.meshFilename = resourceCode;
//         await cachedMesh.save();
//       }
//     };
//     console.log("downloading mesh cache url: " + materialURL + " and filename" + resourceCode);
//     const gg =  await download(remoteMeshUrl,"./resources/" + resourceCode + ".mtl",cb);
//     console.log("finished downloading : " + gg)
//   }
//   let localMeshUrl;
//   if(!cachedMesh || !cachedMesh.meshFilename){
//     console.log("error: file has not been downloaded yet")
//     localMeshUrl =  "./resources/waitdownload.mtl";
//   }else{
//     localMeshUrl = "./resources/" + cachedMesh.meshFilename + ".mtl";
//
//   }
//   fs.readFile(localMeshUrl, function (err,data) {
//     if (err) {
//       console.log("error loading file: " + localMeshUrl);
//       res.writeHead(404);
//       res.end(JSON.stringify(err));
//       return;
//     }
//     console.log("successfully loaded file: " + localMeshUrl);
//     res.writeHead(200, { 'Content-Type': 'text/plain' });
//     res.end(data);
//   })
// };
module.exports = {imageProcessor, meshProcessor, textureProcessor}; // materialProcessor
