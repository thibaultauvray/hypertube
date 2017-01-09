var mongoose = require('../mongoose'),
    User = require('../user_schema'),
    Movie = require('../movie_schema'),
    async = require("async");
/*
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
                        User.update({'username': req.session.username}, {$addToSet: {'votes': {'which':req.body.vote, 'torrentId':req.body.torrentId}}}, function (err, u) {
                            if (err) console.log(err);
                        });
                    }
                    voted = false;
                    res.json({dislikes: dislike, likes: like});
                })

            })
        } else {
            console.log('User not found or not logged in, redirect to home page');
            res.redirect('/');
        }
    })
}
*/

var vote = function (req, res) {
    User.findOne({ username : req.session.username }, function(err, user) {
        if (!err && user) {
            Movie.findOne({'torrent.id': req.body.torrentId}, function (error, movie) {
                if (!error && movie) {
                    console.log(req.body.vote, " movie.like " + movie.like , " movie.dislike " + movie.dislike);
                    var voted = false;
                    var tmpVotes = user.votes;
                    var update = false;
                    tmpVotes.forEach(function (e) {
                        if (e.torrentId == req.body.torrentId){
                            if (e.which){
                                if (req.body.vote == 'down' && e.which == 'up'){
                                    var dislike = movie.dislike + 1;
                                    if (movie.like > 0)
                                        var like = movie.like - 1;
                                    else
                                        var like = movie.like;
                                    update = true;
                                } else if (req.body.vote == 'up' && e.which == 'down'){
                                    var like = movie.like + 1;
                                    if (movie.dislike > 0)
                                        var dislike = movie.dislike - 1;
                                    else
                                        var dislike = movie.dislike;
                                    update = true;
                                }
                                e.which = req.body.vote;
                                voted = true;
                                if (update) {
                                    Movie.update({'torrent.id': req.body.torrentId}, {
                                        $set: {
                                            dislike: dislike,
                                            like: like
                                        }
                                    }, function (err, doc) {
                                        if (err) console.log(err);
                                    });
                                    User.update({username: req.session.username}, {$set: {votes: tmpVotes}}, function (err, u) {
                                        if (err) console.log(err);
                                    });
                                    res.json({dislikes: dislike, likes: like});
                                }
                            }else {
                                console.log("pas encore vote");
                            }
                        }
                    });
                    if (!voted){
                        if (req.body.vote == 'down') {
                            var dislike = movie.dislike + 1;
                            var like = movie.like;
                        } else if (req.body.vote == 'up') {
                            var like = movie.dislike + 1;
                            var dislike = movie.dislike;
                        }
                        Movie.update({'torrent.id': req.body.torrentId}, {
                            $set: {
                                dislike: dislike,
                                like: like
                            }
                        }, function (err, doc) {
                            if (err) console.log(err);
                        });
                        User.update({username: req.session.username}, {
                            $addToSet: {
                                'votes': {
                                    'which': req.body.vote,
                                    'torrentId': req.body.torrentId
                                }
                            }
                        }, function (err, u) {
                            if (err) console.log(err);
                        });
                        res.json({dislikes: dislike, likes: like});
                    }
                }
            })
        }
    })
}

module.exports = vote;