const router = require('express').Router();

//Fetches user uploads and favorites from MongoDB
router.get('/:userID', (req, res) =>{

});

//Fetches array of links to images that a user has favorited
router.get('/:userID/favorites', (req, res) =>{

});

//Fetches array of links to uploaded images
router.get('/:userID/uploads', (req, res) =>{

});

//Adds link to specific photo in user's favorites
router.put('/:userID/favorites', (req, res) =>{

});

exports.router = router;