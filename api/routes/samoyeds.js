const router = require('express').Router();
const fs = require('fs');
const multer = require('multer');
const ObjectId = require('mongodb').ObjectId;

const saveImage = multer({
    dest: __dirname + '/../i/',
    limits: {fileSize: 10000000, files:1},
});

function getRandomSamoyedLinks(count, mongoDB) {
  const samoyeds = mongoDB.collection('samoyeds');
  const query = { $sample: { size: count } };
  return samoyeds.aggregate(query).toArray();
}

// returns up to 10 samoyed links from mongo
router.get('/', (req, res) =>{
  const mongo = req.app.locals.mongoDB;
  let count = parseInt(req.params.count);
  if (!count || count < 1 || count > 10) {
    count = 1;
  }
  getRandomSamoyedLinks(count, mongoDB)
    .then((array) => {
        res.status(201).json({
          image_links: array
        });
      })
    .catch((err) => {
      res.status(500).json({
        error: "Failed to fetch links."
      });
    });
});

function checkIfLinkExists(sid, mongoDB) {
  const samoyeds = mongoDB.collection('samoyeds');
  const query = { _id: new ObjectId(sid) };
  return samoyeds.find(query).toArray();
}

//returns photo with given id
router.get('/:SID', (req, res) =>{
  const mongo = req.app.locals.mongoDB;
  let count = parseInt(req.params.count);
  checkIfLinkExists(SID, mongo)
    .then((result) => {
      if (result[0]) {
        res.status(201).sendFile(`../i/${result[0]}`);
      }
      else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Failed to fetch photo."
      });
    });
});

//publishes samoyed image, posts link to Redis, and associates upload with user
router.post('/', (req, res) =>{
    //TODO: API key validation, save link to DB
    saveImage(req, res, (err)=> {
        if (err) {
            console.log(`error uploading ${err}`);
        }
    })
});

//Deletes published image by link  if uploaded by requester
router.delete('/', (req, res) =>{
    //TODO: user validation. Check passed in API key matches photo associated routes key
    fs.unlink(`i/${req.body.photoID}`, (err)=>{
        if (err) throw err;
        console.log('successfully deleted image');
    });
});

exports.router = router;
