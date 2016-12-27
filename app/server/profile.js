var mongoose = require('../mongoose'),
	_ = require('lodash'),
	async = require("async"),
	User = require('../user_schema');

var profile = function(req, res, next) {

	User.findOne({ username : req.session.username }, function(err, user) {
		if (!err && user) {
			res.render('profile', {
				isApp : true,
				title : 'Hypertube - Profile',
				firstname : _.capitalize(user.firstname),
				language : user.language,
				user : user,
			});
		} else {
			console.log('ERROR : User not found, redirect to homepage...');
			res.redirect('/');
		}
	});

};

module.exports = profile;
