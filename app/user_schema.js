var mongoose = require('./mongoose');

var userSchema = mongoose.Schema({
	token_twitter : String,
	twitter_id : String,
	token_secret_twitter : String,
	access_token_42 : String,
	refresh_token_42 : String,
	facebook_token : String,
	facebook_id : String,
	username : String,
	password : String,
	mail : String,
	firstname : String,
	lastname : String,
	avatar : String,
	language : { type : String, required : true, default : 'EN' },
	history : Array,
	votes: Array
});

var User = mongoose.model('User', userSchema);

module.exports = User;