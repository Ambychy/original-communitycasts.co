'use strict';
var squel = require('squel');

module.exports = function(connection) {
  return {
    send20Tags: function (req, res) {
      var sql = squel.select()
        .from('tags')
        .field('tags.tagName')
        .field('count(*) as count')
        .join('screencastTags', null, 'screencastTags.tagName = tags.tagName')
        .group('tags.tagName')
        .order('count', false)
        .limit(20)
        .toString();
        connection.queryAsync(sql).spread(function(tags) {
          res.json({tags:tags});
        });
    }
  };
};
