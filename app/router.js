var app = require('./express.js'),
	home = require('./server/home'),
	logout = require('./server/logout');
	register = require('./server/register'),
	login = require('./server/login'),
	forgotPassword = require('./server/forgotPassword'),
	resetPassword = require('./server/resetPassword'),
	library = require('./server/library'),
	accueil = require('./server/accueil'),
	player = require('./server/player'),
	makeSearch = require('./server/makeSearch'),
	profile = require('./server/profile'),
	user = require('./server/user');
var graph     = require('fbgraph');
var User = require('./user_schema');


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
	getMovies = require('./server/api/getMovies');
	getMovies = require('./server/api/getMovies'),
	getSearch = require('./server/api/search'),
	getSubtitles = require('./server/api/getSubtitles');

var torrentTest = require('./server/streamtest');
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

// app.use('/app', function(req, res, next)
// {
// 	User.findOne({ username : req.session.username }, function(err, user) {
// 		if (!err && user) {
// 			next();
// 		} else {
// 			console.log('User not found or not logged in, redirect to home page');
// 			res.redirect('/');
// 		}
// 	});
// });

// App routes
app.get('/', home);
app.get('/logout', logout);

app.get('/register', register);
app.get('/login', login);

// app.get('/app/stream', stream.stream);
// app.get('/app/torrent', stream.torrent);
app.get('/torrentTest', torrentTest.torrentTest);

app.get('/users/forgot-password',  forgotPassword);
app.get('/users/reset-password/:username/:token', resetPassword);
app.get('/app/library', library);
app.get('/app/accueil', accueil);

// app.get('/player/html5/:id/:resolution', player);
app.get('/app/player/:id/:magnet', stream.stream);
app.get('/app/torrent/:torrentId/:duration/:magnet', stream.torrent)
//app.get('/player/html5/:text', player);

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
<<<<<<< HEAD
// app.post('/api/movie/subtitles/get', getSubtitles);
=======
app.post('/api/search/movies/get', getSearch);
app.post('/api/movie/subtitles/get', getSubtitles);
>>>>>>> d953798214b538b5125203c91d329449d31d0d3b

// OAuth register and login routes
app.get('/users/register/42', getCode42);
app.get('/users/login/42', getCode42);
app.get('/users/login/twitter', twitter.requestToken);
app.get('/users/signin/twitter', twitter.accessToken);

