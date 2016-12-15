var mongoose = require('../mongoose'),
	_ = require('lodash'),
	User = require('../user_schema');

var profile = function(req, res, next) {
	var users = [];
	var same_shit = false;
	User.findOne({ username : req.session.username }, function(err, user) {
		if (!err && user) {
			User.find({_id: {'$ne': user._id }}, function(err, users_b) {
				users_b.forEach(function(user_b){
					user_b.history.forEach(function(histo_b){	
						user.history.forEach(function(histo){
							if (histo_b.torrent.id == histo.torrent.id)
								same_shit = true;
						})
					})
					if (same_shit)
						users.push(user_b);
				})
				res.render('profile', {
					isApp : true,
					title : 'Hypertube - Profile',
					firstname : _.capitalize(user.firstname),
					language : user.language,
					user : user,
					users: users
				});
			})

			
		} else {
			console.log('ERROR : User not found, redirect to homepage...');
			res.redirect('/');
		}
	});

};

module.exports = profile;
