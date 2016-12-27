var mongoose = require('../../mongoose'),
	User = require('../../user_schema'),
	Movie = require('../../movie_schema'),
	_ = require('lodash');

var addNewVisit = function(req, res, next) {
	User.findOne({ username : req.session.username }, function(err, user) {
		if (!err && user) {
			var history = user.history ? user.history : [];

			Movie.findOne({ 'torrent.id' : req.body.movieID }, function(err, movie) {
				if (!err && movie) {
					var alreadyVisited = false;
					
					for (var i = 0; i < history.length; i++) {
						if (history[i].movie.title === movie.movie.title)
							alreadyVisited = true;
					}

					if (!alreadyVisited) {
						var movie_copy = new Movie(movie);
						
						User.find({ '_id' : {'$ne': user._id}}, function(err, users_b){
							users_b.forEach(function(user_b) {
								var alreadyThere = false;
								user.social.forEach(function(social){
									if (user_b._id === social._id)
										allreadyThere = true;
								})
								if (!alreadyThere) {
									user_b.history.forEach(function(histo_b){
										var same_shit = false;
										user.history.forEach(function(histo){
											if (histo_b.torrent.id === histo.torrent.id) {
												same_shit = true;
											}
										})
										if (same_shit)
											User.update({ username : req.session.username }, { $addToSet : { social : user_b }}, function() {});
									})
								}
							})
						})

						history.unshift(movie_copy);
						history.splice(4);

						User.update(
							{ username : req.session.username },
							{ $addToSet : { history : movie_copy } },
							function() {
								// console.log(history[0].defaultLink);
								console.log('SUCCESS : New movie added to user history');
								res.send({ state : 'success' });
							}
						);
					} else
						res.send({ state : 'already visited' });
				} else {
					console.log('ERROR : history not updated, movie not found');
					res.send({ state : 'movie not found' });
				}
			});
		} else {
			console.log('ERROR : history not updated, user not found');
			res.send({ state : 'user not found' });
		}
	});
};

module.exports = addNewVisit;
