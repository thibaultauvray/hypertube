var mongoose = require('../mongoose'),
	User = require('../user_schema'),
	Movie = require('../movie_schema'),
	_ = require('lodash');
	
var imdb = require('imdb-api');	


var player = function(req, res, next) {
	User.findOne({ username : req.session.username }, function(err, user) {
		if (!err && user) {
			console.log(req.params._id);
			Movie.findOne({ '_id' : req.params._id }, function(err, movie) {
				console.log(movie);
				if (!err && movie) {
					var disabled = true;
			        var isDownload = movie.torrent.isDownload ? movie.torrent.isDownload : false;
					if (!isDownload)
					{
						var disabled = false;
					}
					var ext = movie.ext ? movie.ext : "null";
					subtitles = [];
					subtitles['en'] = movie.subtitles.en && movie.subtitles.en.length != 0 ? movie.subtitles.en : null;
					subtitles['fr'] = movie.subtitles.fr && movie.subtitles.fr.length != 0 ? movie.subtitles.fr : null;
					subtitles['id'] = req.params._id;
	                imdb.getById(movie.movie.imdb.id).then(function (data) {
						res.render('player', {
							isApp : true,
							title : 'Hypertube - Player',
							firstname : _.capitalize(user.firstname),
							language : user.language,
			                isDownload: disabled,
							movie : movie,
							ext: ext,
							subtitles : subtitles,
							magnet: movie.magnet,
							torrentId: movie._id,
			                duration: parseInt(data.runtime),
							params : {
								id : req.params.id,
								resolution : req.params.link,
							},
							likes : movie.like,
							dislikes: movie.dislike
						});
					});
				} else {
					console.log('Movie not found at this url');
					res.redirect('/app/accueil');
				}
			});
		} else {
			console.log('User not found or not logged in, redirect to home page');
			res.redirect('/');
		}
	});
};

module.exports = player;
