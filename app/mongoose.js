var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27018/hypertube');

var db = mongoose.connection;

db.on('error', function (err) {
	console.log('DB Connection error : ', err);
});

db.once('open', function() {
	console.log('DB Connection successed on mongodb://localhost:27018/hypertube');
});

module.exports = mongoose;
