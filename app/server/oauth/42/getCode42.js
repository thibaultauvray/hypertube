var axios = require('axios'),
	mongoose = require('../../../mongoose'),
	User = require('../../../user_schema');

var getCode42 = function(req, res, next) {
	//console.log('QUERY : ', req.query);
	if (req.query && req.query.error) {
		console.log('ERROR : ', req.query.error);
		res.redirect('/users/register');
	} else if (req.query && req.query.code) {
		//console.log('CODE : ', req.query.code);
		axios.post('https://api.intra.42.fr/oauth/token', {
			grant_type : 'authorization_code',
			client_id : '592306c98554ede4bbefe02ae74260c297c9c793583eef689a0420af1b21cece',
			client_secret : '25351452b561e4eddf9e0d7b30cd91c5a9d53b5a7b247ce58e7d9a3a34cee7df',
			code : req.query.code,
			redirect_uri : 'http://localhost:3000/users/register/42'
		}).then(function (response) {
			//console.log('Asking for auth token');
			axios.get('https://api.intra.42.fr/v2/me', {
				headers : { 'Authorization' : response.data.token_type + ' ' + response.data.access_token }
			}).then(function (user) {
				//console.log('Getting user data');
				var newUser = {
					access_token_42 : response.data.access_token,
					refresh_token_42 : response.data.refresh_token,
					username : user.data.login,
					password : 'hypertube1234',
					mail : user.data.email,
					firstname : user.data.displayname.split(' ')[0],
					lastname : user.data.displayname.split(' ')[1],
					avatar : user.data.image_url
				};
				//console.log(newUser);
				axios.post('http://localhost:3000/api/user/new', {
					user : newUser
				}).then(function(resp) {
					if (resp.data.state === 'success')
						res.redirect('/app/library');
					if (resp.data.state === 'user already exist') {
						User.findOne({ username : newUser.username }, function(err, user) {
							if (!err && user) {
								req.session.id = user._id;
								req.session.username = user.username;
								req.session.mail = user.mail;
								req.session.firstname = user.firstname;
								req.session.lastname = user.lastname;
								req.session.language = user.language;

								res.redirect('/app/accueil');
							} else {
								console.log(err);
								res.redirect('/');
							}
						});
					} else {
						console.log('ERROR : ', resp.data.state);
						res.redirect('/users/register');
					}
				});
			}).catch(function (response) {
				console.log('error', response);
			});
		}).catch(function (response) {
			console.log('error ?');
		});

	}
};

module.exports = getCode42;
