var mongoose = require('../mongoose'),
	User = require('../user_schema'),
	Top = require('../movie_schema'),
	_ = require('lodash');


var accueil = function(req, res, next) {	
	var movies = [];
	var vu = false;

	User.findOne({ username : req.session.username }, function(err, user) {
		if (!err && user) {
			Top.find({'torrent.seeders':{$gt:'100'}}).lean().exec(function(err, result){
				if (result) {
					result.forEach(function(film) {
						var movie = film.movie;
						var torrent = film.torrent;
						movies.push({movie,torrent,vu});
					})
				}
				movies.forEach(function(film){
					user.history.forEach(function(histo){

						if (film.torrent.id == histo.torrent.id){
							film.vu = true
						}
					});
				});
				if (!err && movies && movies.length > 0) {
					res.render('Accueil', {
							isApp : true,
							title : 'Hypertube - Accueil',
							firstname : _.capitalize(user.firstname),
							language : user.language,
							movies : movies.sort(function(a,b)	{
												if (a.movie.title > b.movie.title)
													return 1;
												else if (a.movie.title < b.movie.title)
													return -1;
												else
													return 0;
											})
						});
				} else {
					console.log('somthing bad is goining on!!');
					res.redirect('/');
				}
			});
		} else {
					console.log('User not found or not logged in, redirect to home page');
					res.redirect('/');
		};			
	});
}

module.exports = accueil;
