var mongoose = require('../../mongoose'),
    User = require('../../user_schema'),
    Movie = require('../../movie_schema');

var movieCompletion = function (req, res, next) {
    if (req.params.query) 
        var regex = { 'movie.title' : new RegExp(req.params.query, "i" ) };
    console.log(regex);
    User.findOne({ username : req.session.username }, function(err, user) {
        if (!err && user) {
           Movie.find(regex, {'movie.title':1}, function (error, results) {
                if (results){
                    arr = [];
                    results.forEach(function (e) {
                        inside = false;
                        arr.forEach(function (m) {
                            if (m.title == e.movie.title)
                                inside = true;
                        });
                        if (inside == false)
                            arr.push({title: e.movie.title, poster : e.movie.poster});
                    });
                    res.send({movies: arr});
                }
           });
        } else {
            console.log('User not found or not logged in, redirect to home page');
            res.send({ state : 'user not found' });
        }
    });
};

module.exports = movieCompletion;