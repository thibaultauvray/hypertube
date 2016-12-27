var mongoose = require('mongoose');
var User = require('../../user_schema');

var getUsers = function(req, res, next) {
	var users = [];

	User.findOne({username: req.session.username}, function(err, user){
		if (!err && user) {
			User.find({ '_id' : {'$ne': user._id}}, function(err, users_b){
				users_b.forEach(function(user_b) {
					var same_shit = false;
					user_b.history.forEach(function(histo_b){
						user.history.forEach(function(histo){
							if (histo_b.torrent.id === histo.torrent.id) {
								same_shit = true;
							}
						})
					})
					if (same_shit) {
						users.push({_id: user_b._id, avatar: user_b.avatar});
					}
				})
				res.send({state: 'add', users: users});
			})
		} else {
			console.log('ERROR : history not updated, user not found');
			res.send({ state : 'user not found' });
		}
	})
}

module.exports = getUsers;