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



// var config = require('./config/config');
var flash = require('connect-flash');
app.set('view engine', 'handlebars'); // Set template engine
app.engine('handlebars', hbs({
    defaultLayout: 'main',
    helpers: {
        'mod4': function (key, options) {
            if (((parseInt(key) + 1) % 4) === 0)
                return options.fn(this);
            return options.inverse(this);
        }
    }
}));

process.env.NODE_ENV = 'production';

app.enable('view cache');
app.use(express.static('public'));
app.use(express.static('bower_components'));
app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({extended: true, limit: '5mb'}));

app.use(session({
    secret: 'hypertube',
    resave: false,
    saveUninitialized: true
}));

io.on('connection', (socket) => {
    console.log('a user connected');
    console.log(socket.handshake.sessionID);
    global.client = socket.id;
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});
app.use(flash()); // use connect-flash for flash messages stored in session

app.use(function (req, res, next) {
    var views = req.session.views;
    if (!views) {
        views = req.session.views = {};
    }
    // get the url pathname
    var pathname = parseurl(req).pathname;
    // count the views
    views[pathname] = (views[pathname] || 0) + 1;
    next();
});

app.use(function(req, res, next){
    res.io = io;
    next();
});


module.exports = app;
