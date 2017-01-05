var express = require('express'),
	parseurl = require('parseurl'),
	bodyParser = require('body-parser'),
	session = require('express-session'),
	path = require('path'),
	hbs = require('express-handlebars');
	mongoose = require('./mongoose');
var app = express();

global.client;
const server = app.listen(3000, () => {
    console.log('listening on *:3000');
});
const io = require('socket.io')(server);


app.set('view engine', 'handlebars'); // Set template engine
app.use('/subs', express.static(__dirname + '/public/subtitles'));
app.engine('handlebars', hbs({
	defaultLayout : 'main',
	helpers : {
		'mod4' : function(key, options) {
			if (((parseInt(key) + 1) % 4) === 0)
				return options.fn(this);
			return options.inverse(this);
		},
		"log" : function (thing) {
			console.log(thing);
		},
		"eachProp" : function(arr, options) {
			var ret = "";
			id = arr['id'];
			path = "/subs/" + id + "/" + id +"-";
			for (i in arr){
				if (i != 'id' && arr[i] != null) {
					if (i == 'fr')
						ret = ret + options.fn({key: i, value: arr[i], id:id, lang:"French", src:path+i+".vtt"});
					else if (i == 'en')
						ret = ret + options.fn({key: i, value: arr[i], id:id, lang:"English", src:path+i+".vtt"});
				}
			}

			return ret;
		}
	}
}));

io.on('connection', (socket) => {
    console.log('a user connected');
    console.log(socket.handshake.sessionID);
    global.client = socket.id;
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

process.env.NODE_ENV = 'production';
app.enable('view cache');

app.use(express.static('public'));
app.use(express.static('bower_components'));
app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({ extended : true, limit : '5mb' }));

app.use(session({
	secret : 'hypertube',
	resave : false,
	saveUninitialized : true
}));

app.use(function (req, res, next) {
    res.io = io;
	var views = req.session.views ;
	if (!views) {
		views = req.session.views = {};
	}
	// get the url pathname
	var pathname = parseurl(req).pathname ;
	// count the views
	views[pathname] = (views[pathname] || 0) + 1;
	next();
});


module.exports = app;
