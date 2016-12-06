var mongoose = require('../mongoose'),
	User = require('../user_schema'),
	Movie = require('../movie_schema'),
	_ = require('lodash');

var tmp = [];
var movies = [];

//mongoose.connect('mongodb://localhost:27017/hypertube');

var db = mongoose.connection;

db.on('error', function (err) {
  console.log('DB Connection error : ', err);
});
/*
db.once('open', function() {
  console.log('DB Connection successed on mongodb://localhost:27017/hypertube');
});
*/
module.exports = mongoose;


var accueil = function(req, res, next) {
	User.findOne({ username : req.session.username }, function(err, user) {
		if (!err && user) {
			tmp = db.collection("movies").find().sort( { 'movie.title': 1 } );
	
			tmp.forEach(function(result){
				var movie = result.movie;
				var torrent = result.torrent;
				movies.push({movie, torrent});
			});
	//console.log(movies);
	//movies.sort();
	/*
	movies.sort(function (a, b) {
	  if (a.value > b.value)
	    return 1;
	  if (a.value < b.value)
	    return -1;
	  // a doit être égale à b
	  return 0;
	});
	*/

			res.render('Accueil', {
							isApp : true,
							title : 'Hypertube - Accueil',
							firstname : _.capitalize(user.firstname),
							language : user.language,
							movies : movies
						});
		} else {
			console.log('User not found or not logged in, redirect to home page');
			res.redirect('/');
		}
	});	

};

module.exports = accueil;