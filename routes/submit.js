var express = require('express');
var moment  = require('moment');
var youtube = require('../youtube');

var router  = express.Router();

youtube.authenticate('AIzaSyCKQFYlDRi5BTd1A-9rhFjF8Jb_Hlfnquk');

router.get('/', function(req, res) {
  res.render('submit');
});

router.post('/', function (req, res) {

  req.checkBody('url', 'YouTube Url is missing.').notEmpty();
  req.checkBody('url', 'Url must be a YouTube url.').matches(/^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/);
  req.checkBody('technologies', 'Please enter at least one technology.').notEmpty();
  var errors = req.validationErrors();
  if (errors) {
    res.render('submit', { errors: errors });
    return;
  }

  var screencastId = youtube.parseIdFromUrl(req.body.url);
  var tags = req.body.technologies.split(',');

  var query = 
    'SELECT screencastId \
     FROM screencasts \
     WHERE screencastId = ?';
  connection.queryAsync(query, screencastId).spread(function (screencasts) {
    if (screencasts.length === 1) {
      res.render('submit', { errors: [{ msg: 'This video has already been submitted.' }] })
      return;
    }
    youtube.get(screencastId).then(function(screencast) {
      if (screencast === null) {
        res.render('submit', { errors: [{ msg:'This screencast could not be found.' }] })
        return;
      }
      connection.beginTransactionAsync().then(function() {
        return connection.queryAsync('INSERT IGNORE INTO channels SET ?', screencast.channel);
      }).then(function(result) {
        var record = {
          screencastId: screencastId,
          channelId: screencast.channel.channelId,
          title: screencast.title,
          durationInSeconds: moment.duration(screencast.duration).asSeconds(),
        }
        return connection.query('INSERT INTO screencasts SET ?', record);
      }).then(function(result) {
        var values = tags.map(function(tag) { return [tag]; });
        return connection.queryAsync('INSERT IGNORE INTO tags VALUES ?', [values])
      }).then(function(result) {
        var values = tags.map(function(tag) { return [screencast.screencastId, tag]; });
        return connection.queryAsync('INSERT INTO screencastTags VALUES ?', [values])
      }).then(function() {
        res.redirect('/');
        return connection.commit();
      }).error(function(){
        connection.rollback();
      });
    });
  });
});

module.exports = router;