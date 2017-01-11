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
					subtitles['id'] = req.params.id;
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
							torrentId: req.params.id,
			                duration: parseInt(data.runtime),
							params : {
								id : req.params.id,
								resolution : req.params.link
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
