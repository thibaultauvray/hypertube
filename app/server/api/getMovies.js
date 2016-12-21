var mongoose 	= require('../../mongoose'),
	Movie 		= require('../../movie_schema'),
	User 		= require('../../user_schema');
/*
var getMovies = function(req, res, next) {
	Movie.find()
		.skip(req.body.skip)
		.limit(req.body.limit)
		.sort({ [req.body.sort] : req.body.order })
		.exec(function(err, movies) {
			//console.log(req.body);
			if (!err && movies && movies.length > 0) {
				for (var i = 0; i < movies.length; i++) {
					movies[i].director = movies[i].director ? movies[i].director.split(', ')[0] : 'N/A';
					movies[i].runtime = movies[i].runtime ? movies[i].runtime : 'N/A';
					movies[i].actors = movies[i].actors ? movies[i].actors.slice(2).join(', ') : 'N/A';
					if (movies[i].plot)
						movies[i].plot = movies[i].plot.length > 105 ? movies[i].plot.substring(0, 105) + '[...]' : movies[i].plot;
					movies[i].genres = movies[i].genres ? movies[i].genres.join(' | ') : 'N/A';
					movies[i].rated = movies[i].rated ? movies[i].rated : 'N/A';
				}
				res.send({ state : 'success', movies : movies });
			} else {
				console.log('No movies found, infinite scroll stop.')
				res.send({ state : 'No movies found' });
			}
		});
};
*/

var getMovies = function(req, res, next) {
	var movies = [];
	User.findOne({ username : req.session.username }, function(err, user) {
		if (!err && user) {
			if (req.body.genres != 'All'){
				user.history.forEach(function(movie){
					movie.movie.genres.forEach(function(genre){
						if (req.body.genres === genre)
							movies.push(movie);
					})
					
				})
				res.send({ state : 'success', movies : movies.sort(function(a,b){
						if (req.body.sort == 'movie.title'){
							if (req.body.order == 1){
								if (a.movie.title > b.movie.title)
									return 1;
								if (a.movie.title < b.movie.title)
									return -1;
								return 0;
							} else {
								if (a.movie.title < b.movie.title)
									return 1;
								if (a.movie.title > b.movie.title)
									return -1;
								return 0;
							}
						}
						if (req.body.sort == 'movie.imdb.rating'){
							if (a.movie.imdb.rating < b.movie.imdb.rating)
								return 1;
							if (a.movie.imdb.rating > b.movie.imdb.rating)
								return -1;
							return 0;
						}
						if (req.body.sort == 'movie.year'){
							if (a.movie.year < b.movie.year)
								return 1;
							if (a.movie.year > b.movie.year)
								return -1;
							return 0;
						}
					})
				});
			} else {
				res.send({ state : 'success', movies : user.history.sort(function(a,b){
						if (req.body.sort == 'movie.title'){
							if (req.body.order == 1){
								if (a.movie.title > b.movie.title)
									return 1;
								if (a.movie.title < b.movie.title)
									return -1;
								return 0;
							} else {
								if (a.movie.title < b.movie.title)
									return 1;
								if (a.movie.title > b.movie.title)
									return -1;
								return 0;
							}
						}
						if (req.body.sort == 'movie.imdb.rating'){
							if (a.movie.imdb.rating < b.movie.imdb.rating)
								return 1;
							if (a.movie.imdb.rating > b.movie.imdb.rating)
								return -1;
							return 0;
						}
						if (req.body.sort == 'movie.year'){
							if (a.movie.year < b.movie.year)
								return 1;
							if (a.movie.year > b.movie.year)
								return -1;
							return 0;
						}
					})
				});
			}
 		}
 	});
}

module.exports = getMovies;
