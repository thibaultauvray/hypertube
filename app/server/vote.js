var mongoose = require('../mongoose'),
    User = require('../user_schema'),
    Movie = require('../movie_schema');

var vote = function (req, res) {
    User.findOne({ username : req.session.username }, function(err, user) {
        if (!err && user  && user.votes.indexOf(req.body.torrentId) == -1){
            Movie.findOne({'torrent.id':req.body.torrentId}, function (er, movie) {
                if (!er && movie) {
                    if (req.body.vote == 'down') {
                        dislike = movie.dislike + 1;
                        Movie.update({'torrent.id':req.body.torrentId}, {$set : {dislike : dislike}}, function (err, doc) {
                            User.update({ username : req.session.username }, {$addToSet: {votes: req.body.torrentId}}, function (err, u) {
                                res.json({dislikes: dislike});
                            });
                        });
                    } else if (req.body.vote == 'up'){
                        like = movie.like + 1;
                        Movie.update({'torrent.id':req.body.torrentId}, {$set : {like : like}}, function (err, doc) {
                            User.update({ username : req.session.username }, {$addToSet: {votes: req.body.torrentId}}, function (err, u) {
                                res.json({likes: like});
                            });
                        });
                    } else {
                        res.send("error");
                    }
                }
            });
        } else {
            res.send('error');
        }
    });
};


module.exports = vote;