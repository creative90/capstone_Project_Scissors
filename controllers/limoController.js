const Limo = require('../models/limoModel');
const shortid = require('shortid');

const { convertStrToQrCode, fetchCacheValue } = require('../utils/utils');
const asyncHandler = require('express-async-handler')

const shortenLimo = asyncHandler(async (req, res, next) => {
  try {
    //  get the url
    const { original_url } = req.body;
    let shortID, cacheKey, qrCode;

    // check if user inserted originalUrl
    if (!original_url)
      res.render('index', {
        data: {
          shortenedLimo: null,
          error: `you haven't inserted any link/limos.`,
        },
      });

    // check if original_url already exists in database
    const url = await Limo.findOne({ user: req.user.id, original_url });

    // get shortid of existing url
    if (url) {
      shortID = url.shortened_url;
      cacheKey = url.qr_code;
      qrCode = fetchCacheValue(cacheKey);
      res.render('index', {
        data: {
          shortenedLimo: shortID,
          error: null,
          qr_code: qrCode,
          username: req.user.username,
        },
      });
      return;
    }

    if (!url) {
      // converts string(url) to qrcode, if url doesn't exists
      cacheKey = convertStrToQrCode(original_url);

      // generate short ID which will be sent to user
      shortID = shortid.generate();
    }

    // save url info to database
    await Limo.create({
      original_url,
      shortened_url: shortID,
      qr_code: cacheKey,
      user: req.user.id,
    });

    //  fetch cached value (qr code) from cached memory
    if (cacheKey) qrCode = fetchCacheValue(cacheKey);

    // find links created by current user

    const limos = await Limo.find({ user: req.user.id });

    console.log(limos);
    // render user info
    res.render('index', {
      data: {
        shortenedLimo: shortID,
        error: null,
        qr_code: qrCode,
        username: req.user.username,
        history: limos,
      },
    });
  } catch (err) {
    res.render('index', {
      data: { shortenedLimo: null, error: err.message, qr_code: null },
    });
  }
});

const getSiteFromShortenedLimo = asyncHandler(async (req, res, next) => {
  try {
    // get the shortened url form the params
    const { shortID } = req.params;

    // fetch shortID
    const limo = await Limo.findOne({ shortened_url: shortID });

    // return error message if link not found
    if (!limo) res.status(400).send('Link not Found.');

    // update analytics
    limo.updateAnalytics();

    // saved analytics update
    await limo.save();

    console.log(limo);

    // redirect user to original url
    res.redirect(limo.original_url);
  } catch (error) {
    console.error('Error retrieving link:', error.message);
    res.status(500).json({
      status: 'failed',
      error: 'An error occurred while retrieving the link',
    });
  }
});

module.exports = {shortenLimo,getSiteFromShortenedLimo };
