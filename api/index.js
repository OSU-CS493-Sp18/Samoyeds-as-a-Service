const router = module.exports = require('express').Router();

const { router: reportRouter } = require('./report');
const { router: samoyedsRouter } = require('./samoyeds');
const { router: usersRouter } = require('./users');

router.use('/report', reportRouter);
router.use('/samoyeds', samoyedsRouter);
router.use('/users', usersRouter);