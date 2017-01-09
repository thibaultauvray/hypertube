var mongoose = require('../mongoose'),
    User = require('../user_schema'),
    Movie = require('../movie_schema'),
    async = require("async");

var vote = function (req, res) {
    User.findOne({ username : req.session.username }, function(err, user) {
        if (!err && user){
            var tmpVotes = user.votes;
            Movie.findOne({'torrent.id': req.body.torrentId}, function (error, movie) {
                var dislike = movie.dislike;
                var like = movie.like;
                var voted = false;
                async.each(tmpVotes, function (vote, err) {
                    if (vote.torrentId == req.body.torrentId) {
                        if (vote.which != req.body.vote){
                            if (req.body.vote === 'down') {
                                dislike++;
                                if (like > 0)
                                    like--;
                            } else {
                                like++;
                                if (dislike > 0)
                                    dislike--;
                            }
                            voted = true;
                        }
                        vote.which = req.body.vote;

                        Movie.update({'torrent.id': req.body.torrentId}, {$set: {dislike: dislike, like : like}}, function (err, doc) {
                            if (err) console.log(err);
                        })
                        User.update({username: req.session.username}, {$set: {votes: tmpVotes}}, function (err, u) {
                            if (err) console.log(err);
                        });
                        res.json({dislikes: dislike, likes: like});
                    }
                }, function (err){
                    console.log(voted);
                    if (!voted) {
                        if (req.body.vote === 'down') {
                            dislike++;
                            if (like > 0)
                                like--;
                        } else {
                            like++;
                            if (dislike > 0)
                                dislike--;
                        }
                        Movie.update({'torrent.id': req.body.torrentId}, {$set: {dislike: dislike, like : like}}, function (err, doc) {
                            if (err) console.log(err);
                        })
                        User.update({username: req.session.username}, {$addToSet: {votes: {'which':req.body.vote, 'torrentId':req.body.torrentId}}}, function (err, u) {
                            if (err) console.log(err);
                        });
                    }
                    res.json({dislikes: dislike, likes: like});
                })

            })
        } else {
            console.log('User not found or not logged in, redirect to home page');
            res.redirect('/');
        }
    })
}

module.exports = vote;