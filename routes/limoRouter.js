const express = require('express');
const {shortenLimo, getSiteFromShortenedLimo} = require('../controllers/limoController');

const router = express.Router();

router.route('/shorten').post(shortenLimo);

router.route('/:shortID').get(getSiteFromShortenedLimo);

module.exports = router;
