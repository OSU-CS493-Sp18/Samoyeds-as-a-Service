const router = require('express').Router();
const fs = require('fs');
const multer = require('multer');
const imageTypes = ['image/jpeg', 'image/png'];
const ObjectId = require('mongodb').ObjectId;

const { generateAuthToken, requireAuthentication } = require('../../lib/auth');

const storage = multer.diskStorage(
    {
        destination: function (req, file, cb) {
            cb(null, __dirname + '/../i/')
        },
        filename: function (req, file, cb) {
            cb(null, new ObjectId().toString() + '.' + file.mimetype.split("/")[1]);
        }
    }
);

const upload = multer({
    dest: __dirname + '/../i/',
    storage: storage,
    limits: {fileSize: 10000000, files:1},
    fileFilter: function (req, file, cb) {
        if (validateFileUpload(file)) {
            cb(null, true);
        }
        return cb(null, false, new Error('goes wrong on the mimetype'));
    }
});

const saveImage = upload.single('photo');

function getRandomSamoyedLinks(count, mongoDB) {
  const samoyeds = mongoDB.collection('samoyeds');
  const query = [{ $sample: { size: count } }];
  return samoyeds.aggregate(query)
      .project({
        path: 0
      })
      .toArray();
}

// returns up to 10 samoyed links from mongo
router.get('/', (req, res) =>{
  const mongo = req.app.locals.mongoDB;
  let count = parseInt(req.query.count);
  if (!count || count < 1 || count > 10) {
    count = 1;
  }
    getRandomSamoyedLinks(count, mongo)
    .then((array) => {
        array.forEach((item) => {
            item.link = `/samoyeds/${item._id}`;
        });
        res.status(200).json({
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

// returns photo with given id
router.get('/:SID', (req, res) =>{
  const mongo = req.app.locals.mongoDB;
  checkIfLinkExists(req.params.SID, mongo)
    .then((result) => {
      if (result[0]) {
        res.status(200).sendFile(result[0].path);
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

function validateFileUpload(file) {
    return file && imageTypes.includes(file.mimetype);
}
//https://stackoverflow.com/questions/32461271/nodejs-timeout-a-promise-if-failed-to-complete-in-time
function getOutputFromPython(ms, pythonShell, mongoID) {
    return new Promise(function(resolve, reject) {
        // Set up the real work
        pythonShell.stdout.on('data', function _listener (data) {
            const results = data.toString().split(" ");
            if (results[1] === mongoID) {
                pythonShell.stdout.removeListener('data', _listener);
                resolve(results[0]);
            }
        });
        // Set up the timeout
        setTimeout(function() {
            reject('Promise timed out after ' + ms + ' ms');
        }, ms);
    });
}

function insertNewImage(path, id, mongoDB) {
    const imageDocument = {
        _id: ObjectId(id),
        path: path
    };
    const samoyedCollection = mongoDB.collection('samoyeds');
    return samoyedCollection
        .insertOne(imageDocument)
        .then((result) => {
            return Promise.resolve(result.insertedId);
        })
}

function getUserByID(userID, mongoDB, includePassword) {
    const usersCollection = mongoDB.collection('users');
    const projection = includePassword ? {} : { password: 0 };

    return usersCollection
        .find({ "_id": ObjectId( userID ) })
        .project(projection)
        .toArray()
        .then((results) => {
            return Promise.resolve(results[0]);
        });
}

function addUploadToUserID(userID, newupload, mongoDB) {
    const usersCollection = mongoDB.collection('users');
    const myquery = { _id: ObjectId(userID) };
    getUserByID(userID, mongoDB, true)
        .then((user) => {
            if (user) {
                let uploads = user.uploads;
                uploads.push(newupload);

                const newvalues = { $set: {uploads: uploads} };

                return usersCollection.updateOne(myquery, newvalues)
                    .then((results) => {
                        return Promise.resolve(results);
                    });

            } else {
                next();
            }
        })
        .catch((err) => {
            res.status(500).json({
                error: "Unable to fetch uploads.  Please try again later."
            });
        });
}

//publishes samoyed image, posts link to Redis, and associates upload with user
router.post('/', requireAuthentication, (req, res) =>{
    const id = req.user;
    if (req.user !== req.headers.userid) {
        res.status(403).json({
            error: "Unauthorized to access that resource"
        });
    } else {
        const pythonShell = req.app.locals.pythonShell;
        const mongoDB = req.app.locals.mongoDB;
        saveImage(req, res, function (err) {
            if (err) {
                res.status(400).json({
                    error: "Request doesn't contain a valid png or jpeg."
                });
            }
            const mongoID = req.file.filename.split('.')[0];
            pythonShell.stdin.write(req.file.path + ' ' + mongoID + '\n');
            getOutputFromPython(2000, pythonShell, mongoID)
                .then((result) => {
                    if (result === "Samoyed") {
                        return insertNewImage(req.file.path, mongoID, mongoDB)
                    }
                    else {
                        return Promise.reject(415);
                    }
                })
                .then((result) => {
                    return addUploadToUserID(id, `/samoyeds/${mongoID}`, mongoDB);

                })
                .then((results) => {
                    res.status(200).json({
                        _id: mongoID,
                        link: `/samoyeds/${mongoID}`
                    });
                })
                .catch((err) => {
                    if (err === 415) {
                        const reqBody = {
                            photoID: mongoID,
                            issue: "Should have accepted picture"
                        };
                        res.status(415).json({
                            error: "Request is not an image of a samoyed. If it actually is a samoyed, send a report" +
                            " with a request body.",
                            requestBody: reqBody,
                            links: '/report'
                        });
                    } else {
                        res.status(500).json({
                            error: "Unable to process image. Please try again later."
                        });
                    }
                });
        });
    }
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
