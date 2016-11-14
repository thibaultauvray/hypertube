var mhash = require('mhash'),
	mongoose = require('../../mongoose'),
	User = require('../../user_schema');

var setLocale = function(req, res, next) {
	User.findOne({ username : req.session.username }, function(err, user) {
		if (!err && user) {
			if (req.body.lang === 'EN' || req.body.lang === 'FR') {
				User.update(
					{ username : req.session.username },
					{ $set : { language : req.body.lang } },
					function() {
						console.log('Locale updated for user : ', req.session.username);
						res.send({ state : 'success' });
					}
				);
			}
		} else {
			console.log('User locale not updated, user not found');
			res.send({ state : 'user not found '});
		}
	});
};

module.exports = setLocale;
