var app = require('./express.js'),
	home = require('./server/home'),
	logout = require('./server/logout');
	register = require('./server/register'),
	login = require('./server/login'),
	forgotPassword = require('./server/forgotPassword'),
	resetPassword = require('./server/resetPassword'),
	library = require('./server/library'),
	player = require('./server/player'),
	makeSearch = require('./server/makeSearch'),
	profile = require('./server/profile'),
	user = require('./server/user');
var graph     = require('fbgraph');

var facebook = require('./server/facebook');

var addNewUser = require('./server/api/addNewUser'),
	editUser = require('./server/api/editUser'),
	signInUser = require('./server/api/signInUser'),
	sendMail = require('./server/api/sendMail'),
	setNewPassword = require('./server/api/setNewPassword'),
	addNewComment = require('./server/api/addNewComment'),
	deleteComment = require('./server/api/deleteComment'),
	addNewVisit = require('./server/api/addNewVisit'),
	setLocale = require('./server/api/setLocale'),
	getMovies = require('./server/api/getMovies'),
	getSubtitles = require('./server/api/getSubtitles');

var stream = require('./server/stream.js');
var getCode42 = require('./server/oauth/42/getCode42'),
	loginApi42 = require('./server/oauth/42/loginApi42'),
	twitter = require('./server/oauth/twitter/twitter');

/*
	STREAM CONF
 */

var http = require('http');
var fs = require('fs');
var path = require('path');
var imdb = require('imdb-api');


var conf = {
	client_id:      '708073109347264'
	, client_secret:  'fdd5c4ed01b5523d59bb2be11a9760e6'
	, scope:          'email'
	, redirect_uri:   'http://localhost:3000/auth/facebook'
};
// App routes
app.get('/', home);
app.get('/logout', logout);

app.get('/users/register', register);
app.get('/users/login', login);

app.get('/auth/facebook', function(req, res) {

	// we don't have a code yet
	// so we'll redirect to the oauth dialog
	if (!req.query.code) {
		var authUrl = graph.getOauthUrl({
			"client_id":     conf.client_id
			, "redirect_uri":  conf.redirect_uri
			, "scope":         conf.scope
		});

		if (!req.query.error) { //checks whether a user denied the app facebook login/permissions
			res.redirect(authUrl);
		} else {  //req.query.error == 'access_denied'
			res.send('access denied');
		}
		return;
	}

	console.log(req.query.code);
	// code is set
	// we'll send that and get the access token
	graph.authorize({
		"client_id":      conf.client_id
		, "redirect_uri":   conf.redirect_uri
		, "client_secret":  conf.client_secret
		, "code":           req.query.code
	}, function (err, facebookRes) {
		console.log(facebookRes);
		res.redirect('/UserHasLoggedIn');
	});


});

app.get('/stream', stream.stream);
app.get('/torrent', stream.torrent)
app.get('/users/forgot-password',  forgotPassword);
app.get('/users/reset-password/:username/:token', resetPassword);
app.get('/app/library', library);
app.get('/player/html5/:id/:resolution', player);
app.get('/app/search/:text', makeSearch);
app.get('/app/profile', profile);
app.get('/app/user/:id', user);

// Api routes
app.post('/api/user/new', addNewUser);
app.post('/api/user/edit', editUser);
app.post('/api/user/signin', signInUser);

app.post('/api/user/send-mail', sendMail);
app.post('/api/user/password/set', setNewPassword);
app.post('/api/comment/new', addNewComment);
app.post('/api/comment/delete', deleteComment);
app.post('/api/movie/visit/add', addNewVisit);
app.post('/api/user/lang/set', setLocale);
app.post('/api/library/movies/get', getMovies);
app.post('/api/movie/subtitles/get', getSubtitles);

// OAuth register and login routes
app.get('/users/register/42', getCode42);
app.get('/users/login/42', getCode42);
app.get('/users/login/twitter', twitter.requestToken);
app.get('/users/signin/twitter', twitter.accessToken);

function isAuthentifcate()
{
	if (log)
		reict
}