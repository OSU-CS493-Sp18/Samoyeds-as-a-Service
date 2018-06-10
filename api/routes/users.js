const router = require('express').Router();
const ObjectId = require('mongodb').ObjectId;
const bcrypt = require('bcryptjs');

const { generateAuthToken, requireAuthentication } = require('../../lib/auth');

function validateUserObject(user) {
    return user && user.username && user.email && user.password;
}

function insertNewUser(user, mongoDB) {
    return bcrypt.hash(user.password, 8)
        .then((passwordHash) => {
            const userDocument = {
                username: user.username,
                email: user.email,  //We can take out email. Not needed at all.
                password: passwordHash
            };
            const usersCollection = mongoDB.collection('users');
            return usersCollection.insertOne(userDocument);
        })
        .then((result) => {
            return Promise.resolve(result.insertedId);
        });
}

router.post('/', function (req, res) {
    const mongoDB = req.app.locals.mongoDB;
    if (validateUserObject(req.body)) {
        insertNewUser(req.body, mongoDB)
            .then((id) => {
                res.status(201).json({
                    _id: id,
                    links: {
                        user: `/users/${id}`
                    }
                });
            })
            .catch((err) => {
                res.status(500).json({
                    error: "Failed to insert new user."
                });
            });
    } else {
        res.status(400).json({
            error: "Request doesn't contain a valid user."
        })
    }
});

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

function getUserByUserName(username, mongoDB, includePassword) {
    const usersCollection = mongoDB.collection('users');
    const projection = includePassword ? {} : { password: 0 };

    return usersCollection
        .find({ username: username })
        .project(projection)
        .toArray()
        .then((results) => {
            return Promise.resolve(results[0]);
        });
}

router.post('/login', function (req, res) {
    const mongoDB = req.app.locals.mongoDB;
    let id = null;
    if (req.body && req.body.username && req.body.password) {

        getUserByUserName(req.body.username, mongoDB, true)
            .then((user) => {
                if (user) {
                    id = user._id;
                    return bcrypt.compare(req.body.password, user.password);
                } else {
                    return Promise.reject(401);
                }
            })
            .then((loginSuccessful) => {
                if (loginSuccessful) {
                    return generateAuthToken(id);
                } else {
                    return Promise.reject(401);
                }
            })
            .then((token) => {
                res.status(200).json({
                    token: token
                });
            })
            .catch((err) => {
                console.log(err);

                if (err === 401) {
                    res.status(401).json({
                        error: "Invalid credentials."
                    });
                } else {
                    res.status(500).json({
                        error: "Failed to fetch user."
                    });
                }
            });

    } else {
        res.status(400).json({
            error: "Request needs a user ID and password."
        })
    }
});


//Fetches user uploads and favorites from MongoDB
router.get('/:userID', requireAuthentication, function (req, res, next) {
    const mongoDB = req.app.locals.mongoDB;
    if (req.user !== req.params.userID) {
        res.status(403).json({
            error: "Unauthorized to access that resource"
        });
    } else {
        //Need to figure out how uploads and favorites are being stored into the database.
    }
});

//Fetches array of links to images that a user has favorited
router.get('/:userID/favorites', requireAuthentication, function (req, res) {
    const mongoDB = req.app.locals.mongoDB;
    if (req.user !== req.params.userID) {
        res.status(403).json({
            error: "Unauthorized to access that resource"
        });
    } else {
        //Need to figure out how favorites are being stored into the database.
    }
});

//Fetches array of links to uploaded images
router.get('/:userID/uploads', requireAuthentication, function (req, res) {
    const mongoDB = req.app.locals.mongoDB;
    if (req.user !== req.params.userID) {
        res.status(403).json({
            error: "Unauthorized to access that resource"
        });
    } else {
        //Need to figure out how uploads are being stored into the database.
    }
});

//Adds link to specific photo in user's favorites
router.put('/:userID/favorites', function (req, res) { //Does this need requireAuthentication??????
    //Who is doing this route?
});

exports.router = router;