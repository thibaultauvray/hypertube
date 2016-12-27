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
	getSearch = require('./server/api/search'),
	getUsers = require('./server/api/profile'),
	getSubtitles = require('./server/api/getSubtitles');

var getCode42 = require('./server/oauth/42/getCode42'),
	loginApi42 = require('./server/oauth/42/loginApi42'),
	twitter = require('./server/oauth/twitter/twitter');

// App routes
app.get('/', home);
app.get('/logout', logout);
app.get('/users/register', register);
app.get('/users/login', login);
app.get('/users/forgot-password', forgotPassword);
app.get('/users/reset-password/:username/:token', resetPassword);
app.get('/app/library', library);
app.get('/app/accueil', accueil);
app.get('/player/html5/:id/:magnet', player);
app.get('/player/html5/:text', player);
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
app.post('/api/search/movies/get', getSearch);
app.post('/api/movie/subtitles/get', getSubtitles);
app.post('/api/users/shares/get', getUsers);

// OAuth register and login routes
app.get('/users/register/42', getCode42);
app.get('/users/login/42', getCode42);
app.get('/users/login/twitter', twitter.requestToken);
app.get('/users/signin/twitter', twitter.accessToken);
