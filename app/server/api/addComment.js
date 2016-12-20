/**
 * Created by tauvray on 12/17/16.
 */
var protect = require('./protectEntities');
var Movies = require('../../movie_schema');
var User = require('../../user_schema');

var addComment = function(req, res, next)
{
    User.findOne({ username : req.session.username }, function(err, user) {
        if (!err && user) {
            console.log(user);
            console.log(req.body.torrentId);
            var comment = {
                date: Date.now(),
                text: req.body.comments,
                user: {
                    id: user._id,
                    firstname: user.firstname,
                    lastname: user.lastname,
                    username: user.username,
                    avatar: user.avatar
                }
            };
            Movies.update({'torrent.id': req.body.torrentId}, {$addToSet: {'comments': comment}}, function (err, doc) {
                if (!err)
                    res.send(comment);
                else {
                    console.log("pwet");
                    res.send('error');
                }
            });
        }
        else {
            res.send('error');
        }
    });
}

module.exports = addComment;
