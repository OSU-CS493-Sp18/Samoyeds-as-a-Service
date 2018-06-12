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
                password: passwordHash,
                uploads: [],
                favorites: []
            };
            const usersCollection = mongoDB.collection('users');
            return usersCollection.insertOne(userDocument);
        })
        .then((result) => {
            return Promise.resolve(result.insertedId);
        });
}

function checkIfUserExists(username, mongoDB) {
    const usercollection = mongoDB.collection('users');
    return usercollection
        .find({ username: username })
        .toArray();
}

router.post('/', function (req, res) {

    const mongoDB = req.app.locals.mongoDB;
    if (validateUserObject(req.body)) {
        checkIfUserExists(req.body.username, mongoDB)
            .then((results) => {

                if (results.length === 0) {
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

                } else{
                    res.status(400).json({
                        error: "Request doesn't contain a valid username."
                    })
                }
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

//Fetches user uploads and favorites from MongoDB
router.get('/:userID', requireAuthentication, function (req, res, next) {
    const mongoDB = req.app.locals.mongoDB;
    if (req.user !== req.params.userID) {
        res.status(403).json({
            error: "Unauthorized to access that resource"
        });
    } else {
        getUserByID(req.params.userID, mongoDB, true)
            .then((user) => {
                if (user) {

                    let favorites_links = [];
                    for (favorite in user.favorites){
                        favorites_links.push("/samoyeds/" + user.favorites[favorite] + "");
                    }

                    let uploads_links = [];
                    for (uploads in user.uploads){
                        uploads_links.push("/samoyeds/" + user.uploads[uploads] + "");
                    }

                    res.status(200).json({
                        username: user.username,
                        email: user.email,
                        favorites: favorites_links,
                        uploads: uploads_links
                    });
                } else {
                    next();
                }
            })
            .catch((err) => {
                res.status(500).json({
                    error: "Unable to fetch uploads and/or favorites.  Please try again later."
                });
            });
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
        getUserByID(req.params.userID, mongoDB, true)
            .then((user) => {
                if (user) {

                    let links = [];
                    for (favorite in user.favorites){
                        links.push("/samoyeds/" + user.favorites[favorite] + "");
                    }
                    
                    res.status(200).json({
                        favorites: links
                    });

                } else {
                    next();
                }
            })
            .catch((err) => {
                res.status(500).json({
                    error: "Unable to fetch favorites.  Please try again later."
                });
            });
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
        getUserByID(req.params.userID, mongoDB, true)
            .then((user) => {
                if (user) {

                    let links = [];
                    for (uploads in user.uploads){
                        links.push("/samoyeds/" + user.uploads[uploads] + "");
                    }

                    res.status(200).json({
                        uploads: links
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
});

// Finished but throws warning with promises being missed
// function checkIfLinkExists(sid, mongoDB) {
//     const samoyeds = mongoDB.collection('samoyeds');
//     const query = { _id: new ObjectId(sid) };
//
//     return samoyeds
//         .find(query)
//         .toArray()
//         .then((results) => {
//
//             console.log("results of samoyeds: " + results);
//
//             if (results && results.length > 0){
//                 return Promise.resolve(true);
//             }
//
//             return Promise.resolve(false);
//
//         });
// }
//
// function updateOneUser(userID, favorites, mongoDB, res) {
//     const usersCollection = mongoDB.collection('users');
//     const myquery = { _id: ObjectId(userID) };
//     const newvalues = { $set: { favorites: favorites } };
//     let photoID;
//
//     for (photoID in favorites) {
//
//         checkIfLinkExists(favorites[photoID], mongoDB)
//             .then((results) => {
//                 if (!results){
//                     res.status(400).json({
//                         error: "Unable to find photo"
//                     });
//                 }
//             });
//
//     }
//
//     return usersCollection.updateOne(myquery, newvalues)
//         .then((results) => {
//             return Promise.resolve(true);
//         });
//
// }


function checkIfLinkExists(sid, mongoDB) {
    const samoyeds = mongoDB.collection('samoyeds');
    let queryarry = [];

    for (let s in sid){
        queryarry.push( ObjectId(sid[s]) );
    }

    const query = { _id: { $in: queryarry } };

    return samoyeds
        .find(query)
        .toArray()
        .then((results) => {
            return Promise.resolve(results);
        });
}

function updateOneUser(userID, favorites, mongoDB, res) {
    const usersCollection = mongoDB.collection('users');
    const myquery = { _id: ObjectId(userID) };
    const newvalues = { $set: { favorites: favorites } };

    return checkIfLinkExists(favorites, mongoDB)
        .then((results) => {
            if (!results || results.length < favorites.length){
                return Promise.reject(false);
            }else{

                let checker;

                for (let f in favorites){
                    checker = false;

                    for (let r in results){

                        if( favorites[f] == results[r]._id){
                            checker = true;
                        }
                    }

                    if (checker === false){
                        return Promise.reject(false);
                    }
                }

                return usersCollection.updateOne(myquery, newvalues)
                    .then((results) => {
                        return Promise.resolve(true);
                    });
            }
        });

}

//Adds link to specific photo in user's favorites
router.put('/:userID/favorites', requireAuthentication, function (req, res) {
    const mongoDB = req.app.locals.mongoDB;
    if (req.user !== req.params.userID) {

        res.status(403).json({
            error: "Unauthorized to access that resource"
        });

    } else {

        if (req.body && req.body.favorites && Array.isArray(req.body.favorites)) {

            let check = true;

            for (let fav in req.body.favorites){
                if (req.body.favorites[fav].length !== 24){
                    console.log("Not 24 ------");
                    check = false;
                    res.status(400).json({
                        error: "Unable to find photo"
                    })
                }
            }

            if (check === true) {
                updateOneUser(req.params.userID, req.body.favorites, mongoDB, res)
                    .then((results) => {
                        if (results === false) {
                            res.status(400).json({
                                error: "Unable to find photo"
                            });
                        } else {
                            res.status(200).json({
                                links: {
                                    user: `/users/${req.params.userID}/favorites`
                                }
                            });
                        }
                    })
                    .catch((err) => {
                        console.log(err);

                        res.status(500).json({
                            error: "Unable to update favorites. Please try again later."
                        });
                    });
            }

        }else{
            res.status(400).json({
                error: "Request needs a user ID and password."
            })
        }
    }
});

exports.router = router;