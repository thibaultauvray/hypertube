var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Top100 = new Schema({
    _id 		: String,
    movie 		: {
        title 		: { type: String, unique: true, required: true, dropDups: true },
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
        type		: String,
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
        seeders 	: {type: String, required: true},
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
    }]
},
{
    timestamps: true
});


var Top100 = mongoose.model('Top100', Top100, 'Top100');

module.exports = Top100;
