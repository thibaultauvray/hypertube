var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var tmpSchema = new Schema(
{
	_id 		: String,
	movie 		: {
		title 		: { type: String, required: true },
		year 		: { type: Number, required: true },
		rated 		: String,
		season 		: Number,
		episode 	: Number,
		released 	: Date,
		runtime 	: Number,
		countries	: [String],
		genres 		: { type: [String], index: true },
		director 	: String,
		writers 	: [String],
		actors 		: [String],
		plot 		: String,
		poster 		: { type: String, required: true },
		imdb 		: {
						id 		: String,
						rating	: { type: Number, required: true },
						votes	: Number
					  },
		tomato 		: { type 	: Boolean, default: false},
		metacritic 	: Number,
		awards 		: {
						wins 		: Number,
						nominations : Number,
						text 		: String
					  },
	},
	torrent 	: {
		id 			: Number,
		name		: {type: String, required: true},
		size 		: String,
		path 		: {type		:String, default: null},
		category 	: {
						id 		: String,
						name 	: String
					  },
		seeders 	: {type: Number, required: true},
		leechers 	: String,
		uploadDate 	: String,
		magnetLink 	: { type: String, required: true }, 
		subcategory : {
						id 			: String,
						name 		: String
					  },
		uploader 	: String,
		verified 	: Boolean,
		uploaderLink: String
	},
	subtitles : {
		en : String,
		fr : String
	},
	comments: [{
		id: String,
		date: Date,
		text: String,
		user: {
			id : String,
			firstname: String,
			lastname: String,
			avatar: String
		}
	}],

	ext : String,
	like: {type: Number, default: 0},
	dislike: {type: Number, default: 0}
});

tmpSchema.statics.findByTitle = function (name, cb) {
	return this.find({ 'movie.title': new RegExp('^'+name+'$', 'i') }, cb);
}

var Tmp = mongoose.model('Tmp', tmpSchema, 'tmp');

module.exports = Tmp;
