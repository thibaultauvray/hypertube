var mongoose = require('../mongoose'),
	User = require('../user_schema'),
	Top100 = require('../Top100_schema'),
	_ = require('lodash');

var library = function(req, res, next) {
<<<<<<< HEAD
	console.log("USERNAME" + req.session.username);
	User.findOne({username: req.session.username }, function (err, user) {

=======
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
>>>>>>> 178f6649af5630550933baf734337831a6558d98

		res.render('library', {
			isApp: true,
			title: 'Hypertube - Library',
			isLibrary: true,
			language: user.language,
			firstname: _.capitalize(user.firstname),
			user: user
		});
	})

	};

module.exports = library;
