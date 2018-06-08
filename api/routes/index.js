const router = module.exports = require('express').Router();

router.use('/report', require('./report').router);
router.use('/samoyeds', require('./samoyeds').router);
router.use('/users', require('./samoyeds').router);