var mongoose = require('../mongoose'),
	_ = require('lodash'),
	User = require('../user_schema');

var profile = function(req, res, next) {
	User.findOne({ username : req.session.username }, function(err, user) {
		if (!err && user) {
			// for (var i = 0; i < user.history.length; i++) {
			// 	// console.log(user.history[i]);
			// 	if (user.history[i].resolution === 'N/A')
			// 		user.history[i].resolution = 'undefined';
			// 	user.history[i].link = '/player/html5/' + user.history[i].id + '/' + user.history[i].resolution;
			// }

			res.render('profile', {
				isApp : true,
				title : 'Hypertube - Profile',
				firstname : _.capitalize(user.firstname),
				language : user.language,
				user : user
			});
		} else {
			console.log('ERROR : User not found, redirect to homepage...');
			res.redirect('/');
		}
	});

};

module.exports = profile;
