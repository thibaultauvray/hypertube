var mongoose = require('../mongoose'),
	User = require('../user_schema'),
	Movie = require('../movie_schema'),
	_ = require('lodash');
	
var imdb = require('imdb-api');	


var player = function(req, res, next) {
	User.findOne({ username : req.session.username }, function(err, user) {
		if (!err && user) {
			Movie.findOne({ 'torrent.id' : req.params.id }, function(err, movie) {
				if (!err && movie) {
					// movie.director = movie.director ? movie.director : 'N/A';
					// movie.runtime = movie.runtime ? movie.runtime : 'N/A';
					// movie.actors = movie.actors ? movie.actors.join(', ') : 'N/A';
					// movie.genres = movie.genres ? movie.genres.join(' | ') : 'N/A';
					// movie.rated = movie.rated ? movie.rated : 'N/A';

					// for (var j = 0; j < movie.torrent.length; j++) {
					// 	if (movie.resolutions[j].resolution !== req.params.link) {
					// 		movie.resolutions[j].link = '/player/html5/' + torrent.id + '/' + movie.resolutions[j].resolution;
					// 		if (movie.resolutions[j].resolution === 'undefined')
					// 			movie.resolutions[j].resolution = 'N/A';
					// 	}
					// }
			        var isDownload = movie.torrent.isDownload ? movie.torrent.isDownload : false;
	                imdb.getById(movie.movie.imdb.id).then(function (data) {
						res.render('player', {
							isApp : true,
							title : 'Hypertube - Player',
							firstname : _.capitalize(user.firstname),
							language : user.language,
			                isDownload: isDownload,
							movie : movie,
							magnet: movie.magnet,
							torrentId: req.params.id,
			                duration: parseInt(data.runtime),
							params : {
								id : req.params.id,
								resolution : req.params.link
							}
						});
				});
				} else {
					console.log('Movie not found at this url');
					res.redirect('/app/library');
				}
			});
		} else {
			console.log('User not found or not logged in, redirect to home page');
			res.redirect('/');
		}
	});
};

module.exports = player;
