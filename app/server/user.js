var mongoose = require('../mongoose'),
	_ = require('lodash'),
	User = require('../user_schema');

var user = function(req, res, next) {
	User.findOne({ username : req.session.username }, function(err, user) {
		if (!err && user) {
			var displayNav = user.firstname,
				displayLang = user.language;

			User.findOne({ _id : req.params.id }, function(err, user) {
				if (!err && user) {
					for (var i = 0; i < user.history.length; i++) {
						if (user.history[i].resolution === 'N/A')
							user.history[i].resolution = 'undefined';
						user.history[i].link = '/player/html5/' + user.history[i].id + '/' + user.history[i].resolution;
					}

					res.render('user', {
						isApp : true,
						title : 'Hypertube - ' + _.capitalize(user.firstname),
						language : displayLang,
						firstname : _.capitalize(displayNav),
						user : user
					});
				} else {
					console.log('ERROR : User not found, redirect to homepage...');
					res.redirect('/');
				}
			});
		} else {
			console.log('ERROR : User not found, redirect to homepage...');
			res.redirect('/');
		}
	});
};

module.exports = user;
