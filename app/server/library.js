var mongoose = require('../mongoose'),
	User = require('../user_schema'),
	Movie = require('../movie_schema'),
	_ = require('lodash');

var library = function(req, res, next) {
	console.log("USERNAME" + req.session.username);
	User.findOne({ username : req.session.username }, function(err, user) {
		if (!err && user) {

			res.render('library', {
				isApp : true,
				title : 'Hypertube - Library',
				isLibrary : true,
				language : user.language,
				firstname : _.capitalize(user.firstname)
			});

		} else {
			console.log('User not found or not logged in, redirect to home page');
			res.redirect('/');
		}
	});
};

module.exports = library;
