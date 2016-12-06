var mongoose = require('../mongoose'),
	User = require('../user_schema'),
	Top100 = require('../Top100_schema'),
	_ = require('lodash');

var library = function(req, res, next) {
	User.findOne({ username : req.session.username }, function(err, user) {
		if (!err && user) {
			 //var elem = user.history;
			 // console.log(elem);
			res.render('library', {
				isApp : true,
				title : 'Hypertube - Library',
				isLibrary : true,
				language : user.language,
				firstname : _.capitalize(user.firstname),
				history: user.history
			});

		} else {
			console.log('User not found or not logged in, redirect to home page');
			res.redirect('/');
		}
	});
};

module.exports = library;
